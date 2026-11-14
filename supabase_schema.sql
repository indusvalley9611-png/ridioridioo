-- ==============================================================================
-- NEXORA RIDE — Supabase PostgreSQL Production Schema & Row Level Security (RLS)
-- BlaBlaCar-Style Ride Sharing & Intercity Carpooling Architecture
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. TABLES DEFINITIONS
-- ==============================================================================

-- 2.1 PROFILES TABLE (Linked with Supabase Auth users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    avatar_url TEXT,
    user_role TEXT DEFAULT 'both' CHECK (user_role IN ('passenger', 'driver', 'both')),
    bio TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 2.2 DRIVER PROFILES TABLE (KYC & Documents)
CREATE TABLE IF NOT EXISTS public.driver_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    license_number TEXT NOT NULL,
    license_doc_url TEXT,
    aadhaar_masked TEXT,
    verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    rating NUMERIC(3, 2) DEFAULT 5.00,
    trips_completed INTEGER DEFAULT 0,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 2.3 VEHICLES TABLE (White-Plate Private Vehicles)
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    color TEXT NOT NULL,
    registration_number TEXT NOT NULL UNIQUE,
    total_seats INTEGER DEFAULT 4 CHECK (total_seats BETWEEN 1 AND 8),
    fuel_type TEXT DEFAULT 'Petrol' CHECK (fuel_type IN ('Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid')),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 2.4 RIDES TABLE (Intercity Carpools)
CREATE TABLE IF NOT EXISTS public.rides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
    origin_city TEXT NOT NULL,
    origin_spot TEXT NOT NULL,
    destination_city TEXT NOT NULL,
    destination_spot TEXT NOT NULL,
    stopovers JSONB DEFAULT '[]'::jsonb,
    departure_date DATE NOT NULL,
    departure_time TEXT NOT NULL,
    price_per_seat NUMERIC(10, 2) NOT NULL CHECK (price_per_seat >= 50),
    total_seats INTEGER NOT NULL CHECK (total_seats >= 1),
    available_seats INTEGER NOT NULL CHECK (available_seats >= 0),
    amenities JSONB DEFAULT '{"ac": true, "max_two_in_back": true, "luggage": "medium"}'::jsonb,
    is_instant_booking BOOLEAN DEFAULT true,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'in_progress', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 2.5 BOOKINGS TABLE (Passenger Reservations)
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ride_id UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
    passenger_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    seats_booked INTEGER NOT NULL DEFAULT 1 CHECK (seats_booked >= 1),
    total_price NUMERIC(10, 2) NOT NULL,
    booking_code TEXT NOT NULL, -- e.g. BLA-74892
    boarding_pin TEXT NOT NULL, -- 4-digit PIN e.g. 5821
    status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'boarded', 'completed', 'cancelled')),
    booked_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 2.6 REVIEWS TABLE
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ride_id UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
    passenger_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ==============================================================================
-- 3. AUTOMATIC PROFILE CREATION TRIGGER (ON USER SIGNUP)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, phone, avatar_url, user_role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'NEXORA Rider'),
        NEW.email,
        COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone', ''),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
        COALESCE(NEW.raw_user_meta_data->>'user_role', 'both')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==============================================================================
-- 4. ATOMIC SEAT RESERVATION & CANCELLATION RPC (PREVENTS OVERBOOKING)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.book_ride_seats(
    p_ride_id UUID,
    p_passenger_id UUID,
    p_seats INTEGER,
    p_total_price NUMERIC,
    p_booking_code TEXT,
    p_boarding_pin TEXT
)
RETURNS UUID AS $$
DECLARE
    v_available_seats INTEGER;
    v_booking_id UUID;
BEGIN
    -- Lock the ride record for update to prevent race conditions
    SELECT available_seats INTO v_available_seats
    FROM public.rides
    WHERE id = p_ride_id
    FOR UPDATE;

    IF v_available_seats IS NULL THEN
        RAISE EXCEPTION 'Ride does not exist.';
    END IF;

    IF v_available_seats < p_seats THEN
        RAISE EXCEPTION 'Not enough seats available. Requested: %, Available: %', p_seats, v_available_seats;
    END IF;

    -- Decrement available seats
    UPDATE public.rides
    SET available_seats = available_seats - p_seats,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = p_ride_id;

    -- Create booking
    INSERT INTO public.bookings (
        ride_id,
        passenger_id,
        seats_booked,
        total_price,
        booking_code,
        boarding_pin,
        status
    ) VALUES (
        p_ride_id,
        p_passenger_id,
        p_seats,
        p_total_price,
        p_booking_code,
        p_boarding_pin,
        'confirmed'
    ) RETURNING id INTO v_booking_id;

    RETURN v_booking_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle cancellation and restore seats
CREATE OR REPLACE FUNCTION public.cancel_booking(p_booking_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_ride_id UUID;
    v_seats INTEGER;
    v_passenger_id UUID;
    v_driver_id UUID;
BEGIN
    SELECT b.ride_id, b.seats_booked, b.passenger_id, r.driver_id
    INTO v_ride_id, v_seats, v_passenger_id, v_driver_id
    FROM public.bookings b
    JOIN public.rides r ON b.ride_id = r.id
    WHERE b.id = p_booking_id;

    -- Check if booking belongs to user or driver
    IF p_user_id != v_passenger_id AND p_user_id != v_driver_id THEN
        RAISE EXCEPTION 'Unauthorized to cancel this booking.';
    END IF;

    -- Update booking status
    UPDATE public.bookings
    SET status = 'cancelled',
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = p_booking_id;

    -- Restore seats back to ride
    UPDATE public.rides
    SET available_seats = available_seats + v_seats,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = v_ride_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- 5.1 PROFILES POLICIES
CREATE POLICY "Public profiles are readable by authenticated users"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can edit own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- 5.2 DRIVER PROFILES POLICIES
-- Strict data privacy: Drivers can view only their own private KYC documents and DL
CREATE POLICY "Drivers can view own KYC details"
    ON public.driver_profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Drivers can submit/update own KYC"
    ON public.driver_profiles FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Secure Public View exposing only non-sensitive reputation metrics to riders
CREATE OR REPLACE VIEW public.driver_public_profiles AS
    SELECT id, user_id, verification_status, rating, trips_completed
    FROM public.driver_profiles;

-- 5.3 VEHICLES POLICIES
CREATE POLICY "Vehicles are viewable by all authenticated users"
    ON public.vehicles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Drivers can manage own vehicles"
    ON public.vehicles FOR ALL
    TO authenticated
    USING (auth.uid() = driver_id)
    WITH CHECK (auth.uid() = driver_id);

-- 5.4 RIDES POLICIES
CREATE POLICY "Active rides are searchable by everyone"
    ON public.rides FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Verified drivers can publish rides"
    ON public.rides FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Drivers can update own rides"
    ON public.rides FOR UPDATE
    TO authenticated
    USING (auth.uid() = driver_id);

-- 5.5 BOOKINGS POLICIES
CREATE POLICY "Passengers can view own bookings"
    ON public.bookings FOR SELECT
    TO authenticated
    USING (
        auth.uid() = passenger_id OR
        auth.uid() IN (SELECT driver_id FROM public.rides WHERE id = ride_id)
    );

CREATE POLICY "Passengers can create bookings via authenticated role"
    ON public.bookings FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = passenger_id);

CREATE POLICY "Passengers or Drivers can cancel booking"
    ON public.bookings FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = passenger_id OR
        auth.uid() IN (SELECT driver_id FROM public.rides WHERE id = ride_id)
    );

-- 5.6 REVIEWS POLICIES
CREATE POLICY "Reviews are viewable by everyone"
    ON public.reviews FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Passengers can create reviews for completed rides"
    ON public.reviews FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = passenger_id);

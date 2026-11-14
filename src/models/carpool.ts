/**
 * NEXORA RIDE — BlaBlaCar Carpool Data Models (10/10 Enhanced)
 */

export type ChattinessLevel = 'Bla' | 'BlaBla' | 'BlaBlaBla';

export interface DriverRatingBreakdown {
  punctuality: number; // e.g. 5.0
  drivingSafety: number; // e.g. 4.9
  cleanliness: number; // e.g. 5.0
  friendliness: number; // e.g. 4.9
}

export interface PassengerReview {
  id: string;
  authorName: string;
  authorAvatar?: string;
  authorLocation: string;
  rating: number;
  date: string;
  comment: string;
  verifiedTrip: boolean;
}

export interface CarpoolDriver {
  id: string;
  name: string;
  avatarUrl?: string;
  rating: number; // e.g. 4.9
  reviewCount: number; // e.g. 42
  experienceLevel: 'Newbie' | 'Intermediate' | 'Experienced' | 'Ambassador';
  chattiness: ChattinessLevel;
  isIdVerified: boolean;
  isPhoneVerified: boolean;
  isEmailVerified: boolean;
  isBackgroundChecked: boolean;
  memberSince: string;
  miniBio?: string;
  ratingBreakdown: DriverRatingBreakdown;
  recentReviews: PassengerReview[];
  tripsCompleted: number;
}

export interface CarDetails {
  make: string;
  model: string;
  color: string;
  year?: number;
  licensePlate?: string;
  fuelType?: 'Electric' | 'Petrol' | 'Diesel' | 'Hybrid';
  bootSpaceLiters?: number;
}

export interface RideAmenities {
  ac: boolean;
  maxTwoInBack: boolean;
  luggageSize: 'small' | 'medium' | 'large';
  smokingAllowed: boolean;
  petsAllowed: boolean;
  ladiesOnly?: boolean;
  chargingPorts?: boolean;
  musicAllowed?: boolean;
}

export interface StopoverPoint {
  city: string;
  spot: string;
  eta: string;
  isStopForRefreshment?: boolean;
  refreshmentDurationMinutes?: number;
}

export interface PassengerBooking {
  id: string;
  passengerId: string;
  passengerName: string;
  passengerPhone: string;
  seatsBooked: number;
  boardingPin: string; // 4-digit secure boarding verification PIN
  bookedAt: string;
}

export interface PriceBreakdown {
  fuelShare: number;
  tollShare: number;
  platformSafetyFee: number;
  totalPerSeat: number;
  co2SavedKg: number;
}

export interface CarpoolRide {
  id: string;
  driver: CarpoolDriver;
  origin: {
    city: string;
    spot: string;
    address: string;
    latitude?: number;
    longitude?: number;
  };
  destination: {
    city: string;
    spot: string;
    address: string;
    latitude?: number;
    longitude?: number;
  };
  stopovers: StopoverPoint[];
  date: string; // YYYY-MM-DD
  departureTime: string; // e.g. "06:30 AM"
  arrivalTime: string; // e.g. "11:00 AM"
  duration: string; // e.g. "4h 30m"
  distanceKm: number;
  totalSeats: number;
  availableSeats: number;
  pricePerSeat: number; // in INR
  currency: 'INR';
  priceBreakdown: PriceBreakdown;
  car: CarDetails;
  amenities: RideAmenities;
  isInstantBooking: boolean;
  passengers: PassengerBooking[];
  notes?: string;
  status: 'active' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface CarpoolTicket {
  bookingId: string;
  bookingCode: string; // e.g. "BLA-73821"
  boardingPin: string; // 4-digit PIN e.g. "4821"
  rideId: string;
  passengerId: string;
  passengerName: string;
  passengerPhone: string;
  seatsBooked: number;
  totalAmount: number;
  currency: 'INR';
  status: 'confirmed' | 'boarded' | 'completed' | 'cancelled';
  bookedAt: string;
  qrCodeUrl: string;
  ride: CarpoolRide;
}

export interface ChatMessage {
  id: string;
  sender: 'passenger' | 'driver';
  text: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
}

export interface PublishRideInput {
  originCity: string;
  originSpot: string;
  destinationCity: string;
  destinationSpot: string;
  stopovers?: StopoverPoint[];
  date: string;
  departureTime: string;
  seatsAvailable: number;
  pricePerSeat: number;
  carMake: string;
  carModel: string;
  carColor: string;
  ac: boolean;
  maxTwoInBack: boolean;
  luggageSize: 'small' | 'medium' | 'large';
  smokingAllowed: boolean;
  petsAllowed: boolean;
  instantBooking: boolean;
  notes?: string;
}

/**
 * NEXORA RIDE — Core Types & Models (Phase 1, 2 & 3)
 */

// ── Phase 1 Types (preserved) ──────────────────────────────────────

export interface RideCategory {
  id: 'bike' | 'auto' | 'cab';
  name: string;
  tagline: string;
  etaMinutes: number;
  capacity: string;
  iconName: string;
  estimatedPrice: string; // Preview/simulated range
  badge?: string;
  popular?: boolean;
}

export interface OnboardingSlide {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  badge: string;
}

export interface LocationShortcut {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  isCustom?: boolean;
  coordinates?: LatLng;
}

export interface UserProfile {
  name: string;
  phone: string;
  rating: number;
  totalTrips: number;
  memberSince: string;
  isDemoUser: boolean;
}

// ── Phase 2 Types (preserved) ──────────────────────────────────────

/** Geographic coordinate pair */
export interface LatLng {
  latitude: number;
  longitude: number;
}

/** A resolved location with address and coordinates */
export interface ResolvedLocation {
  coordinates: LatLng;
  address: string;
  name: string;
  /** Whether this location comes from demo/mock data */
  isDemo: boolean;
  placeId?: string;
}

/** A search suggestion from a geocoding provider */
export interface PlaceSuggestion {
  placeId: string;
  name: string;
  address: string;
  coordinates?: LatLng;
  /** Whether this is demo data */
  isDemo: boolean;
}

/** Provider for geocoding & place search */
export interface GeocodingProvider {
  /** Search places by text query */
  searchPlaces(query: string): Promise<PlaceSuggestion[]>;
  /** Get details (coordinates) for a place by its ID */
  getPlaceDetails(placeId: string): Promise<ResolvedLocation | null>;
  /** Reverse geocode coordinates to an address */
  reverseGeocode(coords: LatLng): Promise<ResolvedLocation | null>;
  /** Whether this provider is using real API data or mock fallback */
  readonly isDemo: boolean;
}

/** Route information from a routing provider */
export interface RouteInfo {
  distanceKm: number;
  durationMinutes: number;
  /** Polyline points for drawing on the map */
  polylinePoints: LatLng[];
  /** Whether this is estimated from straight-line or actual road */
  isEstimated: boolean;
}

/** Provider for routing / distance calculations */
export interface RoutingProvider {
  /** Get route between two points */
  getRoute(origin: LatLng, destination: LatLng): Promise<RouteInfo>;
  readonly isDemo: boolean;
}

/** Fare configuration for a ride category */
export interface FareConfig {
  categoryId: 'bike' | 'auto' | 'cab';
  baseFare: number;
  perKmRate: number;
  perMinuteRate: number;
  minimumFare: number;
  /** Surge multiplier (1.0 = no surge) */
  surgeMultiplier: number;
}

/** Calculated fare estimate */
export interface FareEstimate {
  categoryId: 'bike' | 'auto' | 'cab';
  categoryName: string;
  /** Total estimated fare in INR */
  fare: number;
  /** Fare range minimum (fare * 0.9 floored) */
  fareMin: number;
  /** Fare range maximum (fare * 1.1 ceiled) */
  fareMax: number;
  /** Distance used for calculation */
  distanceKm: number;
  /** Duration if available */
  durationMinutes: number | null;
  /** Whether the distance is a straight-line approximation */
  isDistanceApprox: boolean;
  /** Whether this is a demo estimate */
  isDemo: boolean;
  currency: 'INR';
  disclaimer: string;
}

/** The complete trip selection state */
export interface TripSelection {
  pickup: ResolvedLocation | null;
  destination: ResolvedLocation | null;
  selectedCategory: RideCategory | null;
  fareEstimate: FareEstimate | null;
  routeInfo: RouteInfo | null;
}

/** Recent search entry for local persistence */
export interface RecentSearch {
  location: ResolvedLocation;
  timestamp: number;
}

/** Location permission state */
export type LocationPermissionStatus =
  | 'undetermined'
  | 'granted'
  | 'denied'
  | 'requesting'
  | 'error';

// ── Phase 3 Types: Booking & Customer Identity ─────────────────────

export type BookingStatus =
  | 'requested'
  | 'searching'
  | 'assigned'
  | 'arriving'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_match';

export interface CustomerIdentity {
  customerId: string;
  name: string;
  phone: string;
  isDemo: boolean;
}

export interface Booking {
  id: string;
  customerId: string;
  pickup: ResolvedLocation;
  destination: ResolvedLocation;
  rideCategory: 'bike' | 'auto' | 'cab';
  estimatedDistanceKm: number;
  estimatedDurationMinutes: number | null;
  estimatedFareMin: number;
  estimatedFareMax: number;
  currency: 'INR';
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  idempotencyKey?: string | null;
  /** True if persisted only locally in demo fallback mode */
  isLocalDemo?: boolean;
}

export interface CreateBookingPayload {
  pickup: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    is_demo: boolean;
  };
  destination: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    is_demo: boolean;
  };
  ride_category: 'bike' | 'auto' | 'cab';
  estimated_distance_km: number;
  estimated_duration_minutes?: number | null;
  estimated_fare_min: number;
  estimated_fare_max: number;
  currency: 'INR';
  idempotency_key?: string;
}

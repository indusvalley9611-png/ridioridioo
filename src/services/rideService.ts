/**
 * NEXORA RIDE — Ride Booking Service (Phase 3)
 *
 * Handles persistent ride requests, status querying, and cancellation.
 * Connects to the backend REST API when available, and provides an
 * explicitly labelled local demo fallback when the server is unreachable.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { Booking, BookingStatus, CreateBookingPayload, CustomerIdentity } from '@/models/types';

// Verified Customer Identity
export const CURRENT_CUSTOMER: CustomerIdentity = {
  customerId: 'cust_gokul_01',
  name: 'Gokul R.',
  phone: '+91 98765 43210',
  isDemo: false,
};

const LOCAL_BOOKINGS_STORAGE_KEY = '@nexoraride/bookings_v1';
const REQUEST_TIMEOUT_MS = 5000;

/**
 * Determine the backend API URL:
 * - If EXPO_PUBLIC_API_URL is configured, use it.
 * - On Android emulator, localhost is 10.0.2.2.
 * - On iOS simulator / web, localhost is 127.0.0.1.
 */
function getBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/+$/, '');
  }
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000';
  }
  return 'http://127.0.0.1:8000';
}

export interface RideServiceResult<T> {
  data?: T;
  error?: string;
  isServerConnected: boolean;
}

class RideService {
  private baseUrl: string = getBaseUrl();

  /**
   * Health check to detect if backend API is reachable.
   */
  async checkBackendHealth(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${this.baseUrl}/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Create a new ride booking request.
   */
  async createBooking(
    payload: CreateBookingPayload,
    idempotencyKey?: string
  ): Promise<RideServiceResult<Booking>> {
    const key = idempotencyKey || `idem_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const fullPayload: CreateBookingPayload = {
      ...payload,
      idempotency_key: key,
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const response = await fetch(`${this.baseUrl}/api/v1/rides`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Customer-Id': CURRENT_CUSTOMER.customerId,
          'Idempotency-Key': key,
        },
        body: JSON.stringify(fullPayload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const raw = await response.json();
        const booking = this.mapServerBookingToModel(raw, false);
        // Also cache locally for offline access
        await this.saveLocalBooking(booking);
        return { data: booking, isServerConnected: true };
      }

      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.detail || `Server returned error (${response.status})`;
      return { error: errorMsg, isServerConnected: true };
    } catch {
      // Backend unreachable: seamlessly persist to local demo storage
      const fallbackBooking = this.createLocalDemoBooking(fullPayload, key);
      await this.saveLocalBooking(fallbackBooking);
      return {
        data: fallbackBooking,
        isServerConnected: false,
      };
    }
  }

  /**
   * Fetch all bookings for the current customer.
   */
  async listBookings(statusFilter?: BookingStatus): Promise<RideServiceResult<Booking[]>> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const url = statusFilter
        ? `${this.baseUrl}/api/v1/rides?status=${statusFilter}`
        : `${this.baseUrl}/api/v1/rides`;

      const response = await fetch(url, {
        headers: {
          'X-Customer-Id': CURRENT_CUSTOMER.customerId,
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const bookings: Booking[] = (data.bookings || []).map((b: any) =>
          this.mapServerBookingToModel(b, false)
        );
        // Merge with any local demo bookings
        const localList = await this.getLocalBookings();
        const combined = this.mergeBookings(bookings, localList);
        return { data: combined, isServerConnected: true };
      }
    } catch {
      // Fallback to local storage
    }

    const localList = await this.getLocalBookings();
    const filtered = statusFilter
      ? localList.filter((b) => b.status === statusFilter)
      : localList;
    return { data: filtered, isServerConnected: false };
  }

  /**
   * Fetch single booking details by ID.
   */
  async getBooking(rideId: string): Promise<RideServiceResult<Booking>> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const response = await fetch(`${this.baseUrl}/api/v1/rides/${rideId}`, {
        headers: {
          'X-Customer-Id': CURRENT_CUSTOMER.customerId,
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const raw = await response.json();
        const booking = this.mapServerBookingToModel(raw, false);
        await this.saveLocalBooking(booking);
        return { data: booking, isServerConnected: true };
      }
    } catch {
      // Fallback to local lookup
    }

    const localBooking = await this.getLocalBookingById(rideId);
    if (localBooking) {
      return { data: localBooking, isServerConnected: false };
    }
    return { error: 'Booking not found', isServerConnected: false };
  }

  /**
   * Cancel an eligible booking.
   */
  async cancelBooking(rideId: string, reason: string = 'Customer cancelled'): Promise<RideServiceResult<Booking>> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const response = await fetch(`${this.baseUrl}/api/v1/rides/${rideId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Customer-Id': CURRENT_CUSTOMER.customerId,
        },
        body: JSON.stringify({ reason }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const raw = await response.json();
        const updated = this.mapServerBookingToModel(raw, false);
        await this.saveLocalBooking(updated);
        return { data: updated, isServerConnected: true };
      }

      const errorData = await response.json().catch(() => ({}));
      const msg = errorData.detail || 'Could not cancel booking';
      return { error: msg, isServerConnected: true };
    } catch {
      // Server unreachable: update local demo booking if present
      const localBooking = await this.getLocalBookingById(rideId);
      if (localBooking) {
        if (localBooking.status === 'cancelled') {
          return { error: 'Booking is already cancelled', isServerConnected: false };
        }
        if (localBooking.status === 'completed' || localBooking.status === 'in_progress') {
          return { error: `Cannot cancel a ride that is ${localBooking.status}`, isServerConnected: false };
        }
        const updated: Booking = {
          ...localBooking,
          status: 'cancelled',
          cancelledAt: new Date().toISOString(),
          cancellationReason: reason,
          updatedAt: new Date().toISOString(),
        };
        await this.saveLocalBooking(updated);
        return { data: updated, isServerConnected: false };
      }
      return { error: 'Network error and booking not found in local cache', isServerConnected: false };
    }
  }

  // ── Local Storage Helpers ──

  private async getLocalBookings(): Promise<Booking[]> {
    try {
      const raw = await AsyncStorage.getItem(LOCAL_BOOKINGS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private async getLocalBookingById(id: string): Promise<Booking | null> {
    const list = await this.getLocalBookings();
    return list.find((b) => b.id === id) || null;
  }

  private async saveLocalBooking(booking: Booking): Promise<void> {
    try {
      const existing = await this.getLocalBookings();
      const filtered = existing.filter((b) => b.id !== booking.id);
      const updated = [booking, ...filtered].slice(0, 50);
      await AsyncStorage.setItem(LOCAL_BOOKINGS_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Non-fatal
    }
  }

  private createLocalDemoBooking(payload: CreateBookingPayload, idempotencyKey: string): Booking {
    const now = new Date().toISOString();
    return {
      id: `ride_demo_${Date.now().toString(36)}`,
      customerId: CURRENT_CUSTOMER.customerId,
      pickup: {
        name: payload.pickup.name,
        address: payload.pickup.address,
        coordinates: {
          latitude: payload.pickup.latitude,
          longitude: payload.pickup.longitude,
        },
        isDemo: true,
      },
      destination: {
        name: payload.destination.name,
        address: payload.destination.address,
        coordinates: {
          latitude: payload.destination.latitude,
          longitude: payload.destination.longitude,
        },
        isDemo: true,
      },
      rideCategory: payload.ride_category,
      estimatedDistanceKm: payload.estimated_distance_km,
      estimatedDurationMinutes: payload.estimated_duration_minutes ?? null,
      estimatedFareMin: payload.estimated_fare_min,
      estimatedFareMax: payload.estimated_fare_max,
      currency: payload.currency,
      status: 'requested',
      createdAt: now,
      updatedAt: now,
      idempotencyKey,
      isLocalDemo: true,
    };
  }

  private mapServerBookingToModel(raw: any, isLocalDemo: boolean): Booking {
    return {
      id: raw.id,
      customerId: raw.customer_id,
      pickup: {
        name: raw.pickup.name,
        address: raw.pickup.address,
        coordinates: {
          latitude: raw.pickup.latitude,
          longitude: raw.pickup.longitude,
        },
        isDemo: Boolean(raw.pickup.is_demo),
      },
      destination: {
        name: raw.destination.name,
        address: raw.destination.address,
        coordinates: {
          latitude: raw.destination.latitude,
          longitude: raw.destination.longitude,
        },
        isDemo: Boolean(raw.destination.is_demo),
      },
      rideCategory: raw.ride_category,
      estimatedDistanceKm: raw.estimated_distance_km,
      estimatedDurationMinutes: raw.estimated_duration_minutes ?? null,
      estimatedFareMin: raw.estimated_fare_min,
      estimatedFareMax: raw.estimated_fare_max,
      currency: raw.currency || 'INR',
      status: raw.status as BookingStatus,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
      cancelledAt: raw.cancelled_at,
      cancellationReason: raw.cancellation_reason,
      isLocalDemo,
    };
  }

  private mergeBookings(serverList: Booking[], localList: Booking[]): Booking[] {
    const map = new Map<string, Booking>();
    for (const b of localList) map.set(b.id, b);
    for (const b of serverList) map.set(b.id, b); // Server takes precedence
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
}

export const rideService = new RideService();

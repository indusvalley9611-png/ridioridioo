/**
 * NEXORA RIDE — Location Permission Service
 *
 * Handles Android foreground location permission request and
 * current-position retrieval with proper error handling.
 */

import * as Location from 'expo-location';
import type { LatLng, LocationPermissionStatus } from '@/models/types';

export interface LocationResult {
  coords: LatLng;
  timestamp: number;
}

export interface PermissionResult {
  status: LocationPermissionStatus;
  canAskAgain: boolean;
}

/**
 * Check current foreground location permission status without requesting.
 */
export async function checkLocationPermission(): Promise<PermissionResult> {
  try {
    const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();
    return {
      status: status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined',
      canAskAgain: canAskAgain ?? true,
    };
  } catch {
    return { status: 'error', canAskAgain: false };
  }
}

/**
 * Request foreground location permission.
 * Only requests foreground — no background location.
 */
export async function requestLocationPermission(): Promise<PermissionResult> {
  try {
    const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
    return {
      status: status === 'granted' ? 'granted' : 'denied',
      canAskAgain: canAskAgain ?? false,
    };
  } catch {
    return { status: 'error', canAskAgain: false };
  }
}

/**
 * Get the device's current position.
 * Caller must ensure permission is already granted.
 *
 * @param timeoutMs - Maximum time to wait in milliseconds (default 15 s)
 */
export async function getCurrentPosition(timeoutMs: number = 15000): Promise<LocationResult> {
  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
    timeInterval: timeoutMs,
  });

  return {
    coords: {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    },
    timestamp: location.timestamp,
  };
}

/**
 * Check if location services are enabled on the device.
 */
export async function isLocationServicesEnabled(): Promise<boolean> {
  try {
    return await Location.hasServicesEnabledAsync();
  } catch {
    return false;
  }
}

/**
 * NEXORA RIDE — Smart Map Wrapper
 *
 * Web  → NexoraMap.web.tsx (Leaflet + OpenStreetMap — interactive tiles)
 * Native (dev build) → NexoraMap.tsx (Google Maps via react-native-maps)
 * Expo Go → MapFallback (static placeholder)
 *
 * Platform extension resolution handles web vs native automatically.
 */

import React, { useState } from 'react';
import { Platform } from 'react-native';
import Constants, { AppOwnership } from 'expo-constants';
import type { LatLng, RouteInfo } from '@/models/types';
import { NexoraMap } from './NexoraMap';
import { MapFallback } from './MapFallback';

interface SmartMapProps {
  pickup?: LatLng | null;
  destination?: LatLng | null;
  routeInfo?: RouteInfo | null;
  pickupLabel?: string;
  destinationLabel?: string;
  onMapPress?: (coords: LatLng) => void;
  showCenterButton?: boolean;
  height?: number;
  loading?: boolean;
  forceFallback?: boolean;
}

export const SmartMap: React.FC<SmartMapProps> = ({
  pickup,
  destination,
  routeInfo,
  pickupLabel,
  destinationLabel,
  onMapPress,
  showCenterButton = true,
  height = 220,
  loading = false,
  forceFallback = false,
}) => {
  const [mapError, setMapError] = useState(false);
  const isExpoGo = Constants.appOwnership === AppOwnership.Expo;

  // On web, NexoraMap.web.tsx is auto-resolved via platform extension
  // and uses Leaflet + OpenStreetMap — no native crash possible.
  // Only fall back in Expo Go (native) or on explicit error/force.
  if (forceFallback || mapError || isExpoGo) {
    return (
      <MapFallback
        pickup={pickup}
        destination={destination}
        pickupLabel={pickupLabel}
        destinationLabel={destinationLabel}
        routeDistanceKm={routeInfo?.distanceKm}
        routeDuration={routeInfo?.durationMinutes}
        height={height}
        onRetry={mapError ? () => setMapError(false) : undefined}
      />
    );
  }

  return (
    <NexoraMap
      pickup={pickup}
      destination={destination}
      routeInfo={routeInfo}
      pickupLabel={pickupLabel}
      destinationLabel={destinationLabel}
      onMapPress={onMapPress}
      showCenterButton={showCenterButton}
      height={height}
      loading={loading}
    />
  );
};

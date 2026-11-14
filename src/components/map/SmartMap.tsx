/**
 * NEXORA RIDE — Smart Map Wrapper
 *
 * Renders NexoraMap (Google Maps) with automatic fallback to MapFallback
 * when the native map fails to load (no API key, Expo Go, etc).
 */

import React, { useState } from 'react';
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

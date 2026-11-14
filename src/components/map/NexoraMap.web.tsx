/**
 * NEXORA RIDE — Web-Safe Interactive Route Map
 *
 * Platform-specific web implementation of NexoraMap.
 * Uses MapFallback to avoid native-only react-native-maps crashes on Web.
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, spacing, borderRadius, typography, shadows } from '@/theme/tokens';
import type { LatLng, RouteInfo } from '@/models/types';
import { MapFallback } from './MapFallback';

interface NexoraMapProps {
  pickup?: LatLng | null;
  destination?: LatLng | null;
  routeInfo?: RouteInfo | null;
  pickupLabel?: string;
  destinationLabel?: string;
  onMapPress?: (coords: LatLng) => void;
  showCenterButton?: boolean;
  height?: number;
  loading?: boolean;
}

export const NexoraMap: React.FC<NexoraMapProps> = ({
  pickup,
  destination,
  routeInfo,
  pickupLabel = 'Pickup',
  destinationLabel = 'Destination',
  height = 220,
  loading = false,
}) => {
  if (loading) {
    return (
      <View style={[styles.container, { height }, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  return (
    <MapFallback
      pickup={pickup}
      destination={destination}
      pickupLabel={pickupLabel}
      destinationLabel={destinationLabel}
      routeDistanceKm={routeInfo?.distanceKm}
      routeDuration={routeInfo?.durationMinutes}
      height={height}
      message="Web Route Visualizer"
    />
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.xxl,
    overflow: 'hidden',
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  loadingContainer: {
    backgroundColor: colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.sm,
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
  },
});

/**
 * NEXORA RIDE — Map Fallback Component
 *
 * Shown when Google Maps cannot load (missing API key, Expo Go, etc).
 * Provides useful context instead of a blank area.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '@/theme/tokens';
import type { LatLng } from '@/models/types';

interface MapFallbackProps {
  pickup?: LatLng | null;
  destination?: LatLng | null;
  pickupLabel?: string;
  destinationLabel?: string;
  routeDistanceKm?: number | null;
  routeDuration?: number | null;
  height?: number;
  onRetry?: () => void;
  message?: string;
}

export const MapFallback: React.FC<MapFallbackProps> = ({
  pickup,
  destination,
  pickupLabel,
  destinationLabel,
  routeDistanceKm,
  routeDuration,
  height = 220,
  onRetry,
  message,
}) => {
  return (
    <View style={[styles.container, { height }]}>
      {/* Background grid visual */}
      <View style={styles.gridOverlay}>
        <View style={[styles.gridLine, { top: '30%', left: 0, right: 0, height: 1 }]} />
        <View style={[styles.gridLine, { top: '60%', left: 0, right: 0, height: 1 }]} />
        <View style={[styles.gridLine, { left: '35%', top: 0, bottom: 0, width: 1 }]} />
        <View style={[styles.gridLine, { left: '70%', top: 0, bottom: 0, width: 1 }]} />
      </View>

      {/* Main content */}
      <View style={styles.centerContent}>
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name="map-outline" size={28} color={colors.primary} />
        </View>
        <Text style={styles.titleText}>
          {message ?? 'Map Preview Unavailable'}
        </Text>
        <Text style={styles.subtitleText}>
          Configure a Google Maps API key for interactive map display
        </Text>

        {onRetry ? (
          <TouchableOpacity style={styles.retryButton} onPress={onRetry} activeOpacity={0.8}>
            <Ionicons name="refresh" size={14} color={colors.primary} />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Location info badges */}
      {pickup ? (
        <View style={[styles.locationBadge, styles.pickupBadge]}>
          <View style={styles.pickupDot} />
          <Text style={styles.locationBadgeText} numberOfLines={1}>
            {pickupLabel ?? `${pickup.latitude.toFixed(4)}, ${pickup.longitude.toFixed(4)}`}
          </Text>
        </View>
      ) : null}

      {destination ? (
        <View style={[styles.locationBadge, styles.destinationBadge]}>
          <View style={styles.destSquare} />
          <Text style={styles.locationBadgeText} numberOfLines={1}>
            {destinationLabel ?? `${destination.latitude.toFixed(4)}, ${destination.longitude.toFixed(4)}`}
          </Text>
        </View>
      ) : null}

      {/* Route badge */}
      {routeDistanceKm ? (
        <View style={styles.routeBadge}>
          <Ionicons name="navigate" size={11} color={colors.accentText} />
          <Text style={styles.routeBadgeText}>
            ~{routeDistanceKm} km
            {routeDuration ? ` • ~${routeDuration} min` : ''}
            {' (approx)'}
          </Text>
        </View>
      ) : null}
    </View>
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
    backgroundColor: '#EAEFF5',
    position: 'relative',
    ...shadows.sm,
  },
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: '#D7DEE6',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  titleText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  retryText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.semibold,
    color: colors.primary,
  },
  locationBadge: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.pill,
    gap: 4,
    maxWidth: '70%',
  },
  pickupBadge: {
    top: spacing.sm,
    left: spacing.sm,
  },
  destinationBadge: {
    top: spacing.sm,
    right: spacing.sm,
  },
  pickupDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  destSquare: {
    width: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  locationBadgeText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  routeBadge: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.pill,
    gap: 3,
  },
  routeBadgeText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: colors.accentText,
  },
});

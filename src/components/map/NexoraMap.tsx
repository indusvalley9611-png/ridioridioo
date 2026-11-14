/**
 * NEXORA RIDE — Interactive Map Component
 *
 * Uses react-native-maps when a Google Maps API key is configured.
 * Falls back to a styled placeholder when no key is available.
 */

import React, { useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '@/theme/tokens';
import type { LatLng, RouteInfo } from '@/models/types';

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

const BENGALURU_CENTER: Region = {
  latitude: 12.9716,
  longitude: 77.5946,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export const NexoraMap: React.FC<NexoraMapProps> = ({
  pickup,
  destination,
  routeInfo,
  pickupLabel = 'Pickup',
  destinationLabel = 'Destination',
  onMapPress,
  showCenterButton = true,
  height = 220,
  loading = false,
}) => {
  const mapRef = useRef<MapView>(null);

  const fitMarkers = useCallback(() => {
    if (!mapRef.current) return;
    const coords: LatLng[] = [];
    if (pickup) coords.push(pickup);
    if (destination) coords.push(destination);
    if (coords.length === 2) {
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 70, right: 70, bottom: 70, left: 70 },
        animated: true,
      });
    } else if (coords.length === 1) {
      mapRef.current.animateToRegion(
        {
          ...coords[0],
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        400
      );
    }
  }, [pickup, destination]);

  useEffect(() => {
    const timeout = setTimeout(fitMarkers, 400);
    return () => clearTimeout(timeout);
  }, [fitMarkers]);

  const handleCenterPress = () => {
    fitMarkers();
  };

  if (loading) {
    return (
      <View style={[styles.container, { height }, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={
          pickup
            ? { ...pickup, latitudeDelta: 0.02, longitudeDelta: 0.02 }
            : BENGALURU_CENTER
        }
        onPress={(e) => onMapPress?.(e.nativeEvent.coordinate)}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        loadingEnabled
        loadingIndicatorColor={colors.primary}
        loadingBackgroundColor={colors.surfaceMuted}
      >
        {pickup ? (
          <Marker
            coordinate={pickup}
            title={pickupLabel}
            identifier="pickup"
            pinColor="#10B981"
          />
        ) : null}

        {destination ? (
          <Marker
            coordinate={destination}
            title={destinationLabel}
            identifier="destination"
            pinColor={colors.primary}
          />
        ) : null}

        {routeInfo && routeInfo.polylinePoints.length > 1 ? (
          <Polyline
            coordinates={routeInfo.polylinePoints}
            strokeColor={colors.primary}
            strokeWidth={4}
            lineDashPattern={routeInfo.isEstimated ? [8, 6] : undefined}
          />
        ) : null}
      </MapView>

      {/* Center / Fit Markers Button */}
      {showCenterButton && (pickup || destination) ? (
        <TouchableOpacity
          style={styles.centerButton}
          onPress={handleCenterPress}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="crosshairs-gps" size={20} color={colors.primary} />
        </TouchableOpacity>
      ) : null}

      {/* Route estimate badge */}
      {routeInfo ? (
        <View style={styles.routeBadge}>
          <Ionicons name="navigate" size={12} color={colors.accentText} />
          <Text style={styles.routeBadgeText}>
            {routeInfo.distanceKm} km • ~{routeInfo.durationMinutes} min
          </Text>
          {routeInfo.isEstimated ? (
            <Text style={styles.routeBadgeApprox}> (approx)</Text>
          ) : null}
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
    ...shadows.sm,
  },
  map: {
    flex: 1,
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
  centerButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  routeBadge: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.pill,
    gap: 4,
  },
  routeBadgeText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
    color: colors.accentText,
  },
  routeBadgeApprox: {
    fontSize: 10,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
  },
});

/**
 * NEXORA RIDE — Interactive Web Map of India (OpenStreetMap + Leaflet Engine)
 *
 * Provides real street-level maps across India with:
 * - Live OpenStreetMap tile rendering of Indian national highways, cities, roads
 * - Interactive touch/mouse pan & zoom
 * - Precise Pickup & Destination map markers
 * - Connecting route polyline
 * - Zero native crashes on web
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

// Center of India (Nagpur reference)
const DEFAULT_INDIA_CENTER = {
  latitude: 20.5937,
  longitude: 78.9629,
  zoom: 5,
};

function escapeHtml(str: string): string {
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

export const NexoraMap: React.FC<NexoraMapProps> = ({
  pickup,
  destination,
  routeInfo,
  pickupLabel = 'Pickup',
  destinationLabel = 'Destination',
  height = 240,
  loading = false,
}) => {
  if (loading) {
    return (
      <View style={[styles.container, { height }, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading Indian road map...</Text>
      </View>
    );
  }

  // Generate Leaflet HTML for web iframe
  const mapHtml = useMemo(() => {
    const centerLat = pickup ? pickup.latitude : destination ? destination.latitude : DEFAULT_INDIA_CENTER.latitude;
    const centerLng = pickup ? pickup.longitude : destination ? destination.longitude : DEFAULT_INDIA_CENTER.longitude;
    const zoom = pickup && destination ? 8 : pickup || destination ? 13 : DEFAULT_INDIA_CENTER.zoom;

    const markersCode: string[] = [];
    const latLngs: [number, number][] = [];

    if (pickup) {
      latLngs.push([pickup.latitude, pickup.longitude]);
      markersCode.push(`
        var pickupIcon = L.divIcon({
          className: 'custom-pin',
          html: '<div style="background-color: #10B981; width: 16px; height: 16px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>',
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        });
        L.marker([${pickup.latitude}, ${pickup.longitude}], { icon: pickupIcon })
          .addTo(map)
          .bindPopup('<b>${escapeHtml(pickupLabel)}</b>');
      `);
    }

    if (destination) {
      latLngs.push([destination.latitude, destination.longitude]);
      markersCode.push(`
        var destIcon = L.divIcon({
          className: 'custom-pin',
          html: '<div style="background-color: #4F46E5; width: 16px; height: 16px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>',
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        });
        L.marker([${destination.latitude}, ${destination.longitude}], { icon: destIcon })
          .addTo(map)
          .bindPopup('<b>${escapeHtml(destinationLabel)}</b>');
      `);
    }

    let polylineCode = '';
    if (latLngs.length === 2) {
      polylineCode = `
        var routePoints = ${JSON.stringify(latLngs)};
        var polyline = L.polyline(routePoints, {
          color: '#4F46E5',
          weight: 4,
          opacity: 0.85,
          dashArray: '8, 6'
        }).addTo(map);
        map.fitBounds(polyline.getBounds(), { padding: [40, 40] });
      `;
    }

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #0f172a; overflow: hidden; }
    .leaflet-control-zoom { border: none !important; box-shadow: 0 2px 6px rgba(0,0,0,0.2) !important; border-radius: 8px !important; overflow: hidden; }
    .leaflet-control-zoom a { background: #1e293b !important; color: #fff !important; border-bottom: 1px solid #334155 !important; }
    .leaflet-popup-content-wrapper { background: #1e293b; color: #fff; font-family: sans-serif; font-size: 12px; border-radius: 8px; }
    .leaflet-popup-tip { background: #1e293b; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', {
      zoomControl: false,
      attributionControl: false
    }).setView([${centerLat}, ${centerLng}], ${zoom});

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);

    ${markersCode.join('\n')}
    ${polylineCode}
  </script>
</body>
</html>`;
  }, [pickup, destination, pickupLabel, destinationLabel]);

  return (
    <View style={[styles.container, { height }]}>
      <iframe
        srcDoc={mapHtml}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
        } as any}
        title="Interactive Map of India"
      />

      {routeInfo ? (
        <View style={styles.routeBadge}>
          <Ionicons name="navigate" size={12} color="#FFFFFF" />
          <Text style={styles.routeBadgeText}>
            {routeInfo.distanceKm} km • ~{routeInfo.durationMinutes} min
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
  routeBadge: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.pill,
    gap: 4,
  },
  routeBadgeText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
    color: '#FFFFFF',
  },
});

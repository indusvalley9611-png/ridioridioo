import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '@/theme/tokens';

export const MapPlaceholder: React.FC = () => {
  const [pulseAnim] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.35,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1400,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [pulseAnim]);

  return (
    <View style={styles.container}>
      {/* Abstract Map Background Grid */}
      <View style={styles.gridOverlay}>
        <View style={[styles.roadHorizontal, { top: '24%' }]} />
        <View style={[styles.roadHorizontal, { top: '65%' }]} />
        <View style={[styles.roadVertical, { left: '30%' }]} />
        <View style={[styles.roadVertical, { left: '72%' }]} />
        <View style={[styles.roadDiagonal, { top: '35%', left: '10%' }]} />

        {/* Metro / Ring Road Curve Indicator */}
        <View style={styles.ringRoadArc} />
      </View>

      {/* Trajectory Route Line (Simulated) */}
      <View style={styles.trajectoryContainer}>
        <View style={styles.routeDash} />
      </View>

      {/* Current Location Pin with Pulse */}
      <View style={[styles.markerPosition, { left: '26%', top: '56%' }]}>
        <Animated.View
          style={[
            styles.pulseRing,
            {
              transform: [{ scale: pulseAnim }],
              opacity: pulseAnim.interpolate({
                inputRange: [1, 1.35],
                outputRange: [0.6, 0.1],
              }),
            },
          ]}
        />
        <View style={styles.currentLocationPin}>
          <View style={styles.currentLocationInner} />
        </View>
        <View style={styles.locationTag}>
          <Text style={styles.locationTagText}>MG Road, Bengaluru</Text>
        </View>
      </View>

      {/* Destination Marker */}
      <View style={[styles.markerPosition, { right: '22%', top: '22%' }]}>
        <View style={styles.destinationPin}>
          <Ionicons name="location" size={20} color={colors.accentText} />
        </View>
        <View style={styles.destinationTag}>
          <Text style={styles.destinationTagText}>Indiranagar Metro</Text>
        </View>
      </View>

      {/* Map Badge Indicator */}
      <View style={styles.badgeOverlay}>
        <MaterialCommunityIcons name="map-marker-path" size={14} color={colors.primary} />
        <Text style={styles.badgeText}>Neutral Map Preview • Phase 1</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 190,
    backgroundColor: '#EAEFF5',
    borderRadius: borderRadius.xxl,
    overflow: 'hidden',
    position: 'relative',
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    borderWidth: 1,
    borderColor: '#DDE3EA',
    ...shadows.sm,
  },
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  roadHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#D7DEE6',
  },
  roadVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 14,
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#D7DEE6',
  },
  roadDiagonal: {
    position: 'absolute',
    width: '100%',
    height: 10,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '-25deg' }],
    borderColor: '#D7DEE6',
    borderWidth: 1,
  },
  ringRoadArc: {
    position: 'absolute',
    bottom: -40,
    right: -30,
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 10,
    borderColor: 'rgba(199, 243, 107, 0.45)', // Electric lime tint
  },
  trajectoryContainer: {
    position: 'absolute',
    top: '32%',
    left: '32%',
    width: '45%',
    height: 3,
    backgroundColor: colors.primary,
    transform: [{ rotate: '-32deg' }],
    borderRadius: 2,
    opacity: 0.75,
  },
  routeDash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.accent,
  },
  markerPosition: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent,
  },
  currentLocationPin: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  currentLocationInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  locationTag: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginTop: 4,
  },
  locationTagText: {
    color: colors.textInverse,
    fontSize: 10,
    fontWeight: typography.fontWeights.semibold,
  },
  destinationPin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  destinationTag: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginTop: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  destinationTagText: {
    color: colors.textPrimary,
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
  },
  badgeOverlay: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
    marginLeft: 4,
  },
});

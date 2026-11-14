/**
 * NEXORA RIDE — BlaBlaCar-style Carpool Ride Card
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '@/theme/tokens';
import type { CarpoolRide } from '@/models/carpool';

interface CarpoolRideCardProps {
  ride: CarpoolRide;
  onPress: () => void;
}

export const CarpoolRideCard: React.FC<CarpoolRideCardProps> = ({ ride, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.88}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Ride from ${ride.origin.city} to ${ride.destination.city} by ${ride.driver.name} for ${ride.pricePerSeat} rupees`}
    >
      {/* Top Bar: Departure -> Arrival & Duration */}
      <View style={styles.topRow}>
        <View style={styles.timeRouteCol}>
          {/* Departure */}
          <View style={styles.stopRow}>
            <Text style={styles.timeText}>{ride.departureTime}</Text>
            <View style={styles.dotOrigin} />
            <View style={styles.locationCol}>
              <Text style={styles.cityName}>{ride.origin.city}</Text>
              <Text style={styles.spotText} numberOfLines={1}>
                {ride.origin.spot}
              </Text>
            </View>
          </View>

          {/* Timeline Connector */}
          <View style={styles.connectorRow}>
            <View style={styles.connectorLine} />
            <Text style={styles.durationText}>{ride.duration}</Text>
          </View>

          {/* Arrival */}
          <View style={styles.stopRow}>
            <Text style={styles.timeText}>{ride.arrivalTime}</Text>
            <View style={styles.dotDestination} />
            <View style={styles.locationCol}>
              <Text style={styles.cityName}>{ride.destination.city}</Text>
              <Text style={styles.spotText} numberOfLines={1}>
                {ride.destination.spot}
              </Text>
            </View>
          </View>
        </View>

        {/* Price Column */}
        <View style={styles.priceCol}>
          <Text style={styles.priceAmount}>₹{ride.pricePerSeat}</Text>
          <Text style={styles.perSeatLabel}>per seat</Text>
          {ride.isInstantBooking && (
            <View style={styles.instantBadge}>
              <Ionicons name="flash" size={11} color="#059669" />
              <Text style={styles.instantText}>Instant</Text>
            </View>
          )}
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Bottom Bar: Driver Info & Amenities */}
      <View style={styles.bottomRow}>
        <View style={styles.driverInfo}>
          {/* Driver Avatar */}
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>{ride.driver.name.charAt(0)}</Text>
          </View>

          <View style={styles.driverMeta}>
            <View style={styles.driverNameRow}>
              <Text style={styles.driverName}>{ride.driver.name}</Text>
              {ride.driver.isIdVerified && (
                <MaterialCommunityIcons name="check-decagram" size={15} color="#0284C7" />
              )}
            </View>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={12} color="#F59E0B" />
              <Text style={styles.ratingText}>{ride.driver.rating.toFixed(1)}</Text>
              <Text style={styles.reviewsCount}>({ride.driver.reviewCount})</Text>
              <View style={styles.chattinessPill}>
                <Text style={styles.chattinessText}>{ride.driver.chattiness}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Seats Remaining Badge */}
        <View style={styles.seatsBadgeContainer}>
          <Ionicons
            name="people"
            size={13}
            color={ride.availableSeats === 1 ? '#EF4444' : colors.textSecondary}
          />
          <Text
            style={[
              styles.seatsRemainingText,
              ride.availableSeats === 1 && styles.seatsUrgentText,
            ]}
          >
            {ride.availableSeats} {ride.availableSeats === 1 ? 'seat left' : 'seats left'}
          </Text>
        </View>
      </View>

      {/* Features Bar */}
      <View style={styles.featuresRow}>
        <View style={styles.carChip}>
          <Ionicons name="car-outline" size={12} color={colors.textSecondary} />
          <Text style={styles.carText} numberOfLines={1}>
            {ride.car.make} {ride.car.model}
          </Text>
        </View>

        {ride.amenities.maxTwoInBack && (
          <View style={styles.featurePill}>
            <Text style={styles.featurePillText}>Max 2 in back</Text>
          </View>
        )}

        {ride.amenities.ac && (
          <View style={styles.featurePill}>
            <Text style={styles.featurePillText}>AC</Text>
          </View>
        )}

        {ride.amenities.ladiesOnly && (
          <View style={[styles.featurePill, styles.ladiesOnlyPill]}>
            <Text style={styles.ladiesOnlyText}>Ladies Only</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeRouteCol: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
    width: 68,
  },
  dotOrigin: {
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#0284C7',
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
  },
  dotDestination: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginRight: spacing.sm,
  },
  locationCol: {
    flex: 1,
  },
  cityName: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  spotText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textTertiary,
  },
  connectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  connectorLine: {
    width: 2,
    height: 18,
    backgroundColor: colors.borderStrong,
    marginLeft: 71,
    marginRight: spacing.sm,
  },
  durationText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  priceCol: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  priceAmount: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.heavy,
    color: colors.textPrimary,
  },
  perSeatLabel: {
    fontSize: typography.fontSizes.xs,
    color: colors.textTertiary,
    marginTop: -2,
  },
  instantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.pill,
    marginTop: spacing.xs,
    gap: 2,
  },
  instantText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: '#059669',
  },
  divider: {
    height: 1,
    backgroundColor: colors.surfaceMuted,
    marginVertical: spacing.sm,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontWeight: typography.fontWeights.bold,
    fontSize: typography.fontSizes.base,
  },
  driverMeta: {
    flex: 1,
  },
  driverNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  driverName: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  ratingText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  reviewsCount: {
    fontSize: typography.fontSizes.xs,
    color: colors.textTertiary,
  },
  chattinessPill: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: borderRadius.pill,
    marginLeft: 4,
  },
  chattinessText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
  },
  seatsBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.pill,
  },
  seatsRemainingText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
  },
  seatsUrgentText: {
    color: '#EF4444',
    fontWeight: typography.fontWeights.bold,
  },
  featuresRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
  },
  carChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.pill,
  },
  carText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  featurePill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.pill,
  },
  featurePillText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  ladiesOnlyPill: {
    backgroundColor: '#FDF2F8',
  },
  ladiesOnlyText: {
    fontSize: 11,
    color: '#DB2777',
    fontWeight: typography.fontWeights.bold,
  },
});

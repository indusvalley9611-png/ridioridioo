/**
 * NEXORA RIDE — Pre-Booking Review & Confirmation Screen (Phase 3)
 *
 * Upgraded from Phase 2: validates selected trip, enforces idempotency,
 * submits persistent booking to backend/local service, and navigates to Ride Status.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons, FontAwesome6 } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '@/theme/tokens';
import { useTrip } from '@/context/TripContext';
import { SmartMap } from '@/components/map/SmartMap';
import { Button } from '@/components/common/Button';
import { rideService } from '@/services/rideService';
import type { CreateBookingPayload } from '@/models/types';

export default function RideReviewScreen() {
  const router = useRouter();
  const { trip, resetTrip } = useTrip();
  const { pickup, destination, selectedCategory, fareEstimate, routeInfo } = trip;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getCategoryIcon = () => {
    switch (selectedCategory?.id) {
      case 'bike':
        return <MaterialCommunityIcons name="motorbike" size={24} color={colors.primary} />;
      case 'auto':
        return <MaterialCommunityIcons name="rickshaw" size={24} color={colors.primary} />;
      case 'cab':
        return <FontAwesome6 name="car-side" size={20} color={colors.primary} />;
      default:
        return <Ionicons name="car-sport" size={24} color={colors.primary} />;
    }
  };

  const handleConfirmRide = async () => {
    if (!pickup || !destination || !selectedCategory || !fareEstimate) {
      Alert.alert('Incomplete Trip', 'Please ensure pickup, destination and ride category are selected.');
      return;
    }

    setIsSubmitting(true);

    const payload: CreateBookingPayload = {
      pickup: {
        name: pickup.name,
        address: pickup.address,
        latitude: pickup.coordinates.latitude,
        longitude: pickup.coordinates.longitude,
        is_demo: Boolean(pickup.isDemo),
      },
      destination: {
        name: destination.name,
        address: destination.address,
        latitude: destination.coordinates.latitude,
        longitude: destination.coordinates.longitude,
        is_demo: Boolean(destination.isDemo),
      },
      ride_category: selectedCategory.id,
      estimated_distance_km: fareEstimate.distanceKm,
      estimated_duration_minutes: fareEstimate.durationMinutes,
      estimated_fare_min: fareEstimate.fareMin,
      estimated_fare_max: fareEstimate.fareMax,
      currency: 'INR',
    };

    const idempotencyKey = `idem_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    try {
      const result = await rideService.createBooking(payload, idempotencyKey);

      if (result.data) {
        // Reset current selection in context so new trips start fresh
        resetTrip();
        // Navigate to dedicated Ride Status screen
        router.replace({
          pathname: '/ride-status' as any,
          params: { id: result.data.id },
        });
      } else {
        Alert.alert(
          'Booking Failed',
          result.error || 'Could not create your ride booking. Please check your connection and retry.',
          [{ text: 'OK' }]
        );
      }
    } catch {
      Alert.alert(
        'Submission Error',
        'An unexpected error occurred while booking. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditPickup = () => {
    router.push('/location-search?mode=pickup');
  };

  const handleEditDestination = () => {
    router.push('/location-search?mode=destination');
  };

  if (!pickup || !destination || !selectedCategory) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.missingContainer}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color={colors.textTertiary} />
          <Text style={styles.missingTitle}>Incomplete Trip Details</Text>
          <Text style={styles.missingSubtitle}>
            Please select pickup, destination, and ride category before reviewing.
          </Text>
          <Button title="Go Back" variant="primary" onPress={() => router.back()} style={{ marginTop: spacing.lg }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.backButton}
            disabled={isSubmitting}
          >
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Review Your Trip</Text>
          <View style={{ width: 30 }} />
        </View>

        {/* Map Preview */}
        <SmartMap
          pickup={pickup.coordinates}
          destination={destination.coordinates}
          routeInfo={routeInfo}
          pickupLabel={pickup.name}
          destinationLabel={destination.name}
          height={200}
          showCenterButton
        />

        {/* Route Summary Card */}
        <View style={styles.routeCard}>
          {/* Pickup */}
          <TouchableOpacity
            style={styles.locationRow}
            onPress={handleEditPickup}
            activeOpacity={0.7}
            disabled={isSubmitting}
          >
            <View style={styles.pickupDot} />
            <View style={styles.locationTextWrap}>
              <Text style={styles.locationLabel}>PICKUP</Text>
              <Text style={styles.locationName} numberOfLines={1}>{pickup.name}</Text>
              <Text style={styles.locationAddress} numberOfLines={1}>{pickup.address}</Text>
            </View>
            <Ionicons name="pencil" size={14} color={colors.textTertiary} />
          </TouchableOpacity>

          <View style={styles.connector} />

          {/* Destination */}
          <TouchableOpacity
            style={styles.locationRow}
            onPress={handleEditDestination}
            activeOpacity={0.7}
            disabled={isSubmitting}
          >
            <View style={styles.destSquare} />
            <View style={styles.locationTextWrap}>
              <Text style={styles.locationLabel}>DESTINATION</Text>
              <Text style={styles.locationName} numberOfLines={1}>{destination.name}</Text>
              <Text style={styles.locationAddress} numberOfLines={1}>{destination.address}</Text>
            </View>
            <Ionicons name="pencil" size={14} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Category & Fare Card */}
        <View style={styles.fareCard}>
          <View style={styles.categoryRow}>
            <View style={styles.categoryIcon}>{getCategoryIcon()}</View>
            <View style={styles.categoryInfo}>
              <Text style={styles.categoryName}>{selectedCategory.name}</Text>
              <Text style={styles.categoryCapacity}>{selectedCategory.capacity}</Text>
            </View>
          </View>

          <View style={styles.fareDetailsDivider} />

          {/* Distance & Duration */}
          <View style={styles.metricsRow}>
            {fareEstimate ? (
              <View style={styles.metricItem}>
                <Ionicons name="navigate-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.metricValue}>
                  {fareEstimate.distanceKm} km
                  {fareEstimate.isDistanceApprox ? ' (approx)' : ''}
                </Text>
              </View>
            ) : null}
            {fareEstimate?.durationMinutes ? (
              <View style={styles.metricItem}>
                <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.metricValue}>~{fareEstimate.durationMinutes} min</Text>
              </View>
            ) : null}
          </View>

          {/* Fare Display */}
          {fareEstimate ? (
            <View style={styles.farePriceContainer}>
              <Text style={styles.fareLabelText}>Estimated Fare</Text>
              <View style={styles.farePriceRow}>
                <Text style={styles.fareCurrency}>₹</Text>
                <Text style={styles.fareAmount}>{fareEstimate.fareMin}</Text>
                <Text style={styles.fareDash}> – </Text>
                <Text style={styles.fareAmount}>{fareEstimate.fareMax}</Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* Estimate Disclaimer */}
        {fareEstimate ? (
          <View style={styles.disclaimerBox}>
            <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.disclaimerText}>{fareEstimate.disclaimer}</Text>
          </View>
        ) : null}

        {/* Confirm Ride CTA */}
        <View style={styles.ctaContainer}>
          <Button
            title={isSubmitting ? 'Confirming Ride...' : 'Confirm Ride'}
            variant="lime"
            loading={isSubmitting}
            disabled={isSubmitting}
            onPress={handleConfirmRide}
            style={styles.ctaButton}
            icon={!isSubmitting ? <Ionicons name="checkmark-circle" size={18} color={colors.accentText} /> : undefined}
            iconPosition="right"
          />
          <Text style={styles.ctaSubtext}>
            Creates persistent booking • Driver dispatch engine activated in Phase 4
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.heavy,
    color: colors.textPrimary,
  },
  missingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  missingTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
    marginTop: spacing.lg,
  },
  missingSubtitle: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  routeCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickupDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success,
    marginRight: spacing.md,
  },
  destSquare: {
    width: 12,
    height: 12,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginRight: spacing.md,
  },
  locationTextWrap: {
    flex: 1,
    marginRight: spacing.sm,
  },
  locationLabel: {
    fontSize: 9,
    fontWeight: typography.fontWeights.heavy,
    color: colors.textTertiary,
    letterSpacing: 0.8,
  },
  locationName: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
    marginTop: 1,
  },
  locationAddress: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  connector: {
    width: 2,
    height: 20,
    backgroundColor: colors.border,
    marginLeft: 5,
    marginVertical: spacing.xs,
    borderRadius: 1,
  },
  fareCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  categoryCapacity: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  demoEstimateBadge: {
    backgroundColor: colors.warningSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.pill,
  },
  demoEstimateText: {
    fontSize: 9,
    fontWeight: typography.fontWeights.heavy,
    color: colors.warning,
    letterSpacing: 0.3,
  },
  fareDetailsDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginBottom: spacing.md,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metricValue: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textPrimary,
  },
  farePriceContainer: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  fareLabelText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  farePriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  fareCurrency: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  fareAmount: {
    fontSize: typography.fontSizes.display,
    fontWeight: typography.fontWeights.heavy,
    color: colors.primary,
  },
  fareDash: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  demoNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    backgroundColor: colors.warningSoft,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  demoNoticeText: {
    flex: 1,
    fontSize: 11,
    color: colors.textPrimary,
    lineHeight: 16,
  },
  ctaContainer: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  ctaButton: {
    width: '100%',
  },
  ctaSubtext: {
    fontSize: 10,
    color: colors.textTertiary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});

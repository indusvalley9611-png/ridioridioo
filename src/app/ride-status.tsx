/**
 * NEXORA RIDE — Ride Status & Details Screen (Phase 3)
 *
 * Displays live booking state, allows cancellation with confirmation,
 * provides controlled status polling, and reflects backend vs local demo persistence.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons, FontAwesome6 } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '@/theme/tokens';
import { SmartMap } from '@/components/map/SmartMap';
import { Button } from '@/components/common/Button';
import { rideService } from '@/services/rideService';
import type { Booking, BookingStatus } from '@/models/types';

export default function RideStatusScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const rideId = params.id;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isServerConnected, setIsServerConnected] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pollingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchBooking = useCallback(async () => {
    if (!rideId) return;
    setIsRefreshing(true);

    const result = await rideService.getBooking(rideId);
    setIsServerConnected(result.isServerConnected);

    if (result.data) {
      setBooking(result.data);
      setError(null);
    } else {
      setError(result.error || 'Failed to retrieve booking details');
    }

    setIsLoading(false);
    setIsRefreshing(false);
  }, [rideId]);

  // Initial fetch and controlled polling (every 6 seconds while on screen)
  useEffect(() => {
    let isActive = true;

    async function loadInitial() {
      if (!rideId) return;
      const result = await rideService.getBooking(rideId);
      if (!isActive) return;

      setIsServerConnected(result.isServerConnected);
      if (result.data) {
        setBooking(result.data);
        setError(null);
      } else {
        setError(result.error || 'Failed to retrieve booking details');
      }
      setIsLoading(false);
    }

    loadInitial();

    const scheduleNextPoll = () => {
      pollingTimerRef.current = setTimeout(async () => {
        if (!isActive) return;
        const result = await rideService.getBooking(rideId);
        if (!isActive) return;

        setIsServerConnected(result.isServerConnected);
        if (result.data) {
          setBooking(result.data);
          // Stop polling if booking has reached a terminal status
          if (result.data.status === 'completed' || result.data.status === 'cancelled') {
            return;
          }
        }
        scheduleNextPoll();
      }, 6000);
    };

    scheduleNextPoll();

    return () => {
      isActive = false;
      if (pollingTimerRef.current) {
        clearTimeout(pollingTimerRef.current);
      }
    };
  }, [rideId]);

  const handleCancelPress = () => {
    if (!booking) return;

    if (booking.status === 'cancelled') {
      Alert.alert('Notice', 'This ride is already cancelled.');
      return;
    }

    if (booking.status === 'completed' || booking.status === 'in_progress') {
      Alert.alert('Cannot Cancel', `This ride is ${booking.status} and cannot be cancelled.`);
      return;
    }

    Alert.alert(
      'Cancel Ride Request?',
      'Are you sure you want to cancel this ride? There are no cancellation fees during Phase 3.',
      [
        { text: 'Keep Ride', style: 'cancel' },
        {
          text: 'Cancel Ride',
          style: 'destructive',
          onPress: performCancellation,
        },
      ]
    );
  };

  const performCancellation = async () => {
    if (!booking) return;
    setIsCancelling(true);

    try {
      const result = await rideService.cancelBooking(booking.id, 'Customer cancelled from app');
      if (result.data) {
        setBooking(result.data);
        Alert.alert('Ride Cancelled', 'Your ride request has been cancelled.');
      } else {
        Alert.alert('Cancellation Failed', result.error || 'Could not cancel booking. Please try again.');
      }
    } catch {
      Alert.alert('Error', 'An error occurred while cancelling the ride.');
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusBadgeConfig = (status: BookingStatus) => {
    switch (status) {
      case 'requested':
        return {
          label: 'REQUESTED',
          textColor: colors.accentText,
          bgColor: colors.accent,
          icon: 'timer-outline',
          desc: 'Request received and recorded. Driver matchmaking activated in Phase 4.',
        };
      case 'searching':
        return {
          label: 'SEARCHING',
          textColor: colors.primary,
          bgColor: 'rgba(199, 243, 107, 0.4)',
          icon: 'radar',
          desc: 'Scanning nearby captain network.',
        };
      case 'assigned':
      case 'arriving':
      case 'in_progress':
        return {
          label: status.toUpperCase().replace('_', ' '),
          textColor: colors.success,
          bgColor: colors.successSoft,
          icon: 'checkmark-circle-outline',
          desc: 'Captain on the way.',
        };
      case 'completed':
        return {
          label: 'COMPLETED',
          textColor: colors.primary,
          bgColor: colors.surfaceMuted,
          icon: 'checkmark-done-circle',
          desc: 'Trip ended successfully.',
        };
      case 'cancelled':
        return {
          label: 'CANCELLED',
          textColor: colors.error,
          bgColor: colors.errorSoft,
          icon: 'close-circle-outline',
          desc: 'This booking has been cancelled.',
        };
      default:
        return {
          label: status.toUpperCase(),
          textColor: colors.textSecondary,
          bgColor: colors.surfaceMuted,
          icon: 'information-circle-outline',
          desc: 'Booking state recorded.',
        };
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
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

  const formatTimestamp = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) +
      ', ' +
      date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const canCancel =
    booking &&
    booking.status !== 'cancelled' &&
    booking.status !== 'completed' &&
    booking.status !== 'in_progress';

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Retrieving ride details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !booking) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.errorTitle}>Could Not Load Booking</Text>
          <Text style={styles.errorSubtitle}>{error || 'Ride booking not found.'}</Text>
          <Button
            title="Try Again"
            variant="primary"
            onPress={fetchBooking}
            style={{ marginTop: spacing.lg }}
          />
          <Button
            title="Back to Home"
            variant="ghost"
            onPress={() => router.replace('/(tabs)')}
            style={{ marginTop: spacing.sm }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const badgeConfig = getStatusBadgeConfig(booking.status);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.replace('/(tabs)')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ride Status</Text>
          <TouchableOpacity
            onPress={fetchBooking}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.refreshButton}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="refresh" size={20} color={colors.primary} />
            )}
          </TouchableOpacity>
        </View>

        {/* Sync Mode Badge */}
        <View style={styles.syncBannerRow}>
          {isServerConnected && !booking.isLocalDemo ? (
            <View style={styles.serverBadge}>
              <View style={styles.serverDotGreen} />
              <Text style={styles.serverBadgeText}>Backend Server Synced</Text>
            </View>
          ) : (
            <View style={styles.demoBadge}>
              <View style={styles.serverDotOrange} />
              <Text style={styles.demoBadgeText}>Local Demo Storage</Text>
            </View>
          )}
          <Text style={styles.rideIdText}>ID: {booking.id}</Text>
        </View>

        {/* Status Hero Card */}
        <View style={styles.statusCard}>
          <View style={[styles.statusBadge, { backgroundColor: badgeConfig.bgColor }]}>
            <Text style={[styles.statusBadgeText, { color: badgeConfig.textColor }]}>
              {badgeConfig.label}
            </Text>
          </View>

          <Text style={styles.statusDescription}>{badgeConfig.desc}</Text>

          <View style={styles.phaseNoticeBox}>
            <Ionicons name="shield-checkmark-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.phaseNoticeText}>
              Initial Status: Requested. Driver dispatch engine will be activated in Phase 4. No live captain has been assigned.
            </Text>
          </View>
        </View>

        {/* Map Preview */}
        <SmartMap
          pickup={booking.pickup.coordinates}
          destination={booking.destination.coordinates}
          pickupLabel={booking.pickup.name}
          destinationLabel={booking.destination.name}
          height={180}
          showCenterButton
        />

        {/* Trip Details Card */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>TRIP DETAILS</Text>

          {/* Pickup */}
          <View style={styles.locationRow}>
            <View style={styles.pickupDot} />
            <View style={styles.locationTextWrap}>
              <Text style={styles.locationLabel}>PICKUP</Text>
              <Text style={styles.locationName}>{booking.pickup.name}</Text>
              <Text style={styles.locationAddress}>{booking.pickup.address}</Text>
            </View>
          </View>

          <View style={styles.connector} />

          {/* Destination */}
          <View style={styles.locationRow}>
            <View style={styles.destSquare} />
            <View style={styles.locationTextWrap}>
              <Text style={styles.locationLabel}>DESTINATION</Text>
              <Text style={styles.locationName}>{booking.destination.name}</Text>
              <Text style={styles.locationAddress}>{booking.destination.address}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Vehicle Category & Fare */}
          <View style={styles.metaRow}>
            <View style={styles.categoryInfo}>
              <View style={styles.iconCircle}>{getCategoryIcon(booking.rideCategory)}</View>
              <View>
                <Text style={styles.categoryName}>
                  Nexora {booking.rideCategory.toUpperCase()}
                </Text>
                <Text style={styles.metaSubtext}>
                  ~{booking.estimatedDistanceKm} km
                  {booking.estimatedDurationMinutes ? ` • ~${booking.estimatedDurationMinutes} min` : ''}
                </Text>
              </View>
            </View>

            <View style={styles.fareInfo}>
              <Text style={styles.fareAmount}>
                ₹{booking.estimatedFareMin} – ₹{booking.estimatedFareMax}
              </Text>
              <Text style={styles.metaSubtext}>Estimated Fare</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Timestamp Info */}
          <View style={styles.timestampRow}>
            <Text style={styles.timestampLabel}>Booked At</Text>
            <Text style={styles.timestampValue}>{formatTimestamp(booking.createdAt)}</Text>
          </View>

          {booking.cancelledAt ? (
            <View style={styles.timestampRow}>
              <Text style={[styles.timestampLabel, { color: colors.error }]}>Cancelled At</Text>
              <Text style={[styles.timestampValue, { color: colors.error }]}>
                {formatTimestamp(booking.cancelledAt)}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          {canCancel ? (
            <Button
              title={isCancelling ? 'Cancelling...' : 'Cancel Ride'}
              variant="outline"
              loading={isCancelling}
              disabled={isCancelling}
              onPress={handleCancelPress}
              style={styles.cancelBtn}
              textStyle={{ color: colors.error }}
            />
          ) : null}

          <Button
            title="Return to Home"
            variant="primary"
            onPress={() => router.replace('/(tabs)')}
            style={styles.homeBtn}
          />
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
  },
  errorTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  errorSubtitle: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
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
  refreshButton: {
    padding: spacing.xs,
  },
  syncBannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  serverBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.pill,
    gap: 4,
  },
  serverDotGreen: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  serverBadgeText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: colors.success,
  },
  demoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.pill,
    gap: 4,
  },
  serverDotOrange: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.warning,
  },
  demoBadgeText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: colors.warning,
  },
  rideIdText: {
    fontSize: 10,
    color: colors.textTertiary,
    fontWeight: typography.fontWeights.medium,
  },
  statusCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.pill,
    marginBottom: spacing.sm,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: typography.fontWeights.heavy,
    letterSpacing: 0.8,
  },
  statusDescription: {
    fontSize: typography.fontSizes.sm,
    color: colors.textPrimary,
    fontWeight: typography.fontWeights.semibold,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  phaseNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  phaseNoticeText: {
    flex: 1,
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  card: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  cardSectionTitle: {
    fontSize: 10,
    fontWeight: typography.fontWeights.heavy,
    color: colors.textTertiary,
    letterSpacing: 0.8,
    marginBottom: spacing.md,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickupDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
    marginRight: spacing.md,
  },
  destSquare: {
    width: 10,
    height: 10,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginRight: spacing.md,
  },
  locationTextWrap: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 8,
    fontWeight: typography.fontWeights.heavy,
    color: colors.textTertiary,
    letterSpacing: 0.5,
  },
  locationName: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  locationAddress: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
  },
  connector: {
    width: 2,
    height: 16,
    backgroundColor: colors.border,
    marginLeft: 4,
    marginVertical: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  categoryName: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  metaSubtext: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  fareInfo: {
    alignItems: 'flex-end',
  },
  fareAmount: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.heavy,
    color: colors.primary,
  },
  timestampRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  timestampLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  timestampValue: {
    fontSize: 11,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textPrimary,
  },
  actionsContainer: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  cancelBtn: {
    borderColor: '#FECACA',
  },
  homeBtn: {
    width: '100%',
  },
});

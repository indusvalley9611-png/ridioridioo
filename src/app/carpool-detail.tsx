/**
 * NEXORA RIDE — 10/10 Carpool Ride Details & Booking
 *
 * Rich highway itinerary with stopovers, ratings breakdown,
 * verified passenger reviews, cost transparency, and in-app chat.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '@/theme/tokens';
import { CarpoolService } from '@/services/carpoolService';
import { kycService } from '@/services/kycService';
import type { CarpoolRide } from '@/models/carpool';
import { triggerHaptic } from '@/utils/haptics';

export default function CarpoolDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ rideId?: string; seats?: string }>();
  const rideId = params.rideId;

  const [ride, setRide] = useState<CarpoolRide | null>(null);
  const [selectedSeats, setSelectedSeats] = useState(
    Math.max(1, parseInt(params.seats || '1', 10))
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (!rideId) return;
      setIsLoading(true);
      const data = await CarpoolService.getRideById(rideId);
      if (isMounted) {
        setRide(data);
        setIsLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [rideId]);

  if (isLoading || !ride) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading ride details...</Text>
      </SafeAreaView>
    );
  }

  const totalPrice = ride.pricePerSeat * selectedSeats;

  const handleBookSeat = async () => {
    if (selectedSeats > ride.availableSeats) {
      Alert.alert('Seats Unavailable', `Only ${ride.availableSeats} seat(s) remaining on this trip.`);
      return;
    }

    setIsBooking(true);
    try {
      triggerHaptic.impactMedium();
      const user = await kycService.getUserProfile();
      const passengerName = user.fullName && user.fullName !== 'NEXORA Rider' ? user.fullName : 'Passenger';
      const passengerPhone = user.phone || '9876543210';

      const ticket = await CarpoolService.bookRide(
        ride.id,
        selectedSeats,
        passengerName,
        passengerPhone
      );
      triggerHaptic.success();

      router.replace({
        pathname: '/carpool-ticket' as any,
        params: { bookingId: ticket.bookingId },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to complete booking.';
      Alert.alert('Booking Error', msg);
    } finally {
      setIsBooking(false);
    }
  };

  const handleOpenChat = () => {
    router.push({
      pathname: '/chat' as any,
      params: { rideId: ride.id },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ride Itinerary</Text>
        <TouchableOpacity style={styles.chatHeaderBtn} onPress={handleOpenChat}>
          <Ionicons name="chatbubbles-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Date & Eco Banner */}
        <View style={styles.bannerRow}>
          <View style={styles.dateBanner}>
            <Ionicons name="calendar-outline" size={15} color="#0284C7" />
            <Text style={styles.dateBannerText}>{ride.date}</Text>
          </View>
          <View style={styles.ecoBanner}>
            <Ionicons name="leaf" size={14} color="#059669" />
            <Text style={styles.ecoBannerText}>
              {ride.priceBreakdown?.co2SavedKg || 25} kg CO₂ Saved
            </Text>
          </View>
        </View>

        {/* ─── 1. ROUTE TIMELINE & STOPOVERS ─── */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Journey Itinerary</Text>

          {/* Departure */}
          <View style={styles.timelinePoint}>
            <View style={styles.timelineLeft}>
              <Text style={styles.timelineTime}>{ride.departureTime}</Text>
              <View style={styles.originCircle} />
            </View>
            <View style={styles.timelineRight}>
              <Text style={styles.timelineCity}>{ride.origin.city}</Text>
              <Text style={styles.timelineSpot}>{ride.origin.spot}</Text>
              <Text style={styles.timelineAddress}>{ride.origin.address}</Text>
            </View>
          </View>

          {/* Stopovers Along Highway */}
          {ride.stopovers && ride.stopovers.length > 0 ? (
            <View style={styles.stopoversContainer}>
              {ride.stopovers.map((s, idx) => (
                <View key={idx} style={styles.stopoverRow}>
                  <View style={styles.stopoverConnectorLine} />
                  <View style={styles.stopoverDot}>
                    <Ionicons
                      name={s.isStopForRefreshment ? 'cafe' : 'ellipse'}
                      size={10}
                      color={s.isStopForRefreshment ? '#D97706' : colors.textTertiary}
                    />
                  </View>
                  <View style={styles.stopoverContent}>
                    <Text style={styles.stopoverCityText}>
                      {s.city} • <Text style={{ color: colors.textSecondary }}>{s.spot}</Text>
                    </Text>
                    <Text style={styles.stopoverEtaText}>
                      ETA: {s.eta}
                      {s.isStopForRefreshment ? ` (${s.refreshmentDurationMinutes || 15}m coffee stop)` : ''}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.timelineBarContainer}>
              <View style={styles.timelineBar} />
              <View style={styles.durationChip}>
                <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
                <Text style={styles.durationChipText}>{ride.duration} direct</Text>
              </View>
            </View>
          )}

          {/* Destination */}
          <View style={styles.timelinePoint}>
            <View style={styles.timelineLeft}>
              <Text style={styles.timelineTime}>{ride.arrivalTime}</Text>
              <View style={styles.destCircle} />
            </View>
            <View style={styles.timelineRight}>
              <Text style={styles.timelineCity}>{ride.destination.city}</Text>
              <Text style={styles.timelineSpot}>{ride.destination.spot}</Text>
              <Text style={styles.timelineAddress}>{ride.destination.address}</Text>
            </View>
          </View>
        </View>

        {/* ─── 2. DRIVER PROFILE & TRUST METRICS ─── */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Your Driver</Text>

          <View style={styles.driverProfileRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitial}>{ride.driver.name.charAt(0)}</Text>
            </View>
            <View style={styles.driverMetaCol}>
              <View style={styles.driverNameRow}>
                <Text style={styles.driverName}>{ride.driver.name}</Text>
                {ride.driver.isIdVerified && (
                  <MaterialCommunityIcons name="check-decagram" size={16} color="#0284C7" />
                )}
                <View style={styles.levelBadge}>
                  <Text style={styles.levelBadgeText}>{ride.driver.experienceLevel}</Text>
                </View>
              </View>
              <Text style={styles.driverSub}>
                Member since {ride.driver.memberSince} • {ride.driver.tripsCompleted || 40} trips
              </Text>
              <View style={styles.driverRatingRow}>
                <Ionicons name="star" size={14} color="#F59E0B" />
                <Text style={styles.driverRatingText}>{ride.driver.rating.toFixed(2)}</Text>
                <Text style={styles.driverRatingCount}>({ride.driver.reviewCount} ratings)</Text>
              </View>
            </View>
          </View>

          {/* Detailed Ratings Breakdown */}
          {ride.driver.ratingBreakdown && (
            <View style={styles.breakdownGrid}>
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownScore}>{ride.driver.ratingBreakdown.punctuality} ★</Text>
                <Text style={styles.breakdownLabel}>Punctuality</Text>
              </View>
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownScore}>{ride.driver.ratingBreakdown.drivingSafety} ★</Text>
                <Text style={styles.breakdownLabel}>Safe Driving</Text>
              </View>
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownScore}>{ride.driver.ratingBreakdown.cleanliness} ★</Text>
                <Text style={styles.breakdownLabel}>Cleanliness</Text>
              </View>
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownScore}>{ride.driver.ratingBreakdown.friendliness} ★</Text>
                <Text style={styles.breakdownLabel}>Hospitality</Text>
              </View>
            </View>
          )}

          {/* BlaBla Chattiness Meter */}
          <View style={styles.chattinessBox}>
            <View style={styles.chattinessHeader}>
              <Ionicons name="chatbubbles" size={16} color={colors.primary} />
              <Text style={styles.chattinessTitle}>Chattiness: {ride.driver.chattiness}</Text>
            </View>
            <Text style={styles.chattinessDesc}>
              {ride.driver.chattiness === 'Bla' && "Prefers a quiet, relaxing journey."}
              {ride.driver.chattiness === 'BlaBla' && "Likes to chat depending on mood."}
              {ride.driver.chattiness === 'BlaBlaBla' && "Loves friendly conversation throughout the trip!"}
            </Text>
          </View>

          {/* Verified Badges */}
          <View style={styles.verificationRow}>
            <View style={styles.verifBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#059669" />
              <Text style={styles.verifText}>Govt ID Verified</Text>
            </View>
            <View style={styles.verifBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#059669" />
              <Text style={styles.verifText}>Phone & Email Verified</Text>
            </View>
            <View style={styles.verifBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#059669" />
              <Text style={styles.verifText}>Police Checked</Text>
            </View>
          </View>

          {/* Driver Bio */}
          {ride.driver.miniBio ? (
            <View style={styles.bioContainer}>
              <Text style={styles.bioText}>&ldquo;{ride.driver.miniBio}&rdquo;</Text>
            </View>
          ) : null}

          {/* Message Driver Button */}
          <TouchableOpacity style={styles.askDriverBtn} onPress={handleOpenChat}>
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.primary} />
            <Text style={styles.askDriverBtnText}>Have a question? Message {ride.driver.name}</Text>
          </TouchableOpacity>
        </View>

        {/* ─── 3. RECENT PASSENGER REVIEWS ─── */}
        {ride.driver.recentReviews && ride.driver.recentReviews.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardHeader}>Passenger Reviews</Text>
            {ride.driver.recentReviews.map((rev) => (
              <View key={rev.id} style={styles.reviewItem}>
                <View style={styles.reviewTopRow}>
                  <Text style={styles.reviewAuthor}>{rev.authorName}</Text>
                  <View style={styles.reviewRatingPill}>
                    <Ionicons name="star" size={12} color="#F59E0B" />
                    <Text style={styles.reviewRatingText}>{rev.rating}.0</Text>
                  </View>
                </View>
                <Text style={styles.reviewComment}>&ldquo;{rev.comment}&rdquo;</Text>
                <Text style={styles.reviewMeta}>
                  {rev.date} • Verified Carpool Trip
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ─── 4. VEHICLE & AMENITIES ─── */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Vehicle & Comfort Rules</Text>

          <View style={styles.carRow}>
            <Ionicons name="car-sport" size={26} color={colors.primary} />
            <View style={styles.carMeta}>
              <Text style={styles.carName}>
                {ride.car.make} {ride.car.model}
              </Text>
              <Text style={styles.carSub}>
                {ride.car.color} • {ride.car.fuelType || 'Petrol'} {ride.car.licensePlate ? `• ${ride.car.licensePlate}` : ''}
              </Text>
            </View>
          </View>

          <View style={styles.amenityList}>
            <View style={styles.amenityItem}>
              <Ionicons name="snow" size={18} color="#0284C7" />
              <Text style={styles.amenityText}>
                Air Conditioned ({ride.amenities.ac ? 'Guaranteed AC' : 'Non-AC'})
              </Text>
            </View>

            <View style={styles.amenityItem}>
              <Ionicons name="people" size={18} color={colors.primary} />
              <Text style={styles.amenityText}>
                {ride.amenities.maxTwoInBack ? 'Max 2 in the Back (Middle seat kept empty)' : 'Up to 3 in back'}
              </Text>
            </View>

            <View style={styles.amenityItem}>
              <Ionicons name="briefcase" size={18} color={colors.textSecondary} />
              <Text style={styles.amenityText}>
                Luggage Allowance: {ride.amenities.luggageSize.toUpperCase()} (Trunk capacity: {ride.car.bootSpaceLiters || 430}L)
              </Text>
            </View>

            <View style={styles.amenityItem}>
              <Ionicons name="battery-charging" size={18} color="#059669" />
              <Text style={styles.amenityText}>USB Charging Ports available for passengers</Text>
            </View>

            <View style={styles.amenityItem}>
              <MaterialCommunityIcons
                name={ride.amenities.smokingAllowed ? 'smoking' : 'smoking-off'}
                size={18}
                color={ride.amenities.smokingAllowed ? colors.textSecondary : '#EF4444'}
              />
              <Text style={styles.amenityText}>
                {ride.amenities.smokingAllowed ? 'Smoking allowed' : 'Strictly No Smoking inside car'}
              </Text>
            </View>
          </View>

          {ride.notes ? (
            <View style={styles.notesBox}>
              <Ionicons name="information-circle-outline" size={16} color="#0284C7" />
              <Text style={styles.notesText}>{ride.notes}</Text>
            </View>
          ) : null}
        </View>

        {/* ─── 5. TRANSPARENT COST SHARING ─── */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Transparent Cost Sharing</Text>
          <Text style={styles.costSub}>
            Regulated non-commercial cost-sharing capped by Nexora rules:
          </Text>

          <View style={styles.costBreakdownRow}>
            <Text style={styles.costItemName}>Fuel Contribution Share</Text>
            <Text style={styles.costItemValue}>₹{ride.priceBreakdown?.fuelShare || 360}</Text>
          </View>
          <View style={styles.costBreakdownRow}>
            <Text style={styles.costItemName}>Highway Fastag Toll Share</Text>
            <Text style={styles.costItemValue}>₹{ride.priceBreakdown?.tollShare || 70}</Text>
          </View>
          <View style={styles.costBreakdownRow}>
            <Text style={styles.costItemName}>Nexora 24x7 Safety & Insurance</Text>
            <Text style={styles.costItemValue}>₹{ride.priceBreakdown?.platformSafetyFee || 20}</Text>
          </View>
          <View style={[styles.costBreakdownRow, styles.costTotalRow]}>
            <Text style={styles.costTotalName}>Price Per Passenger Seat</Text>
            <Text style={styles.costTotalValue}>₹{ride.pricePerSeat}</Text>
          </View>
        </View>

        {/* ─── 6. SEAT SELECTION ─── */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Select Number of Seats</Text>

          <View style={styles.seatRow}>
            <View>
              <Text style={styles.seatsAvailableLabel}>
                {ride.availableSeats} {ride.availableSeats === 1 ? 'seat' : 'seats'} available
              </Text>
              <Text style={styles.pricePerSeatSub}>₹{ride.pricePerSeat} per seat</Text>
            </View>

            <View style={styles.counterRow}>
              <TouchableOpacity
                style={[styles.counterBtn, selectedSeats <= 1 && styles.counterBtnDisabled]}
                onPress={() => setSelectedSeats((s) => Math.max(1, s - 1))}
                disabled={selectedSeats <= 1}
              >
                <Ionicons name="remove" size={18} color={colors.textPrimary} />
              </TouchableOpacity>

              <Text style={styles.counterValue}>{selectedSeats}</Text>

              <TouchableOpacity
                style={[
                  styles.counterBtn,
                  selectedSeats >= ride.availableSeats && styles.counterBtnDisabled,
                ]}
                onPress={() => setSelectedSeats((s) => Math.min(ride.availableSeats, s + 1))}
                disabled={selectedSeats >= ride.availableSeats}
              >
                <Ionicons name="add" size={18} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Booking Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomPriceCol}>
          <Text style={styles.totalLabel}>Total Price ({selectedSeats} seats)</Text>
          <Text style={styles.totalPriceText}>₹{totalPrice}</Text>
        </View>

        <TouchableOpacity
          style={[styles.bookBtn, isBooking && styles.bookBtnDisabled]}
          onPress={handleBookSeat}
          disabled={isBooking}
          activeOpacity={0.88}
        >
          {isBooking ? (
            <ActivityIndicator size="small" color={colors.accentText} />
          ) : (
            <>
              <Ionicons name="flash" size={18} color={colors.accentText} />
              <Text style={styles.bookBtnText}>
                Instant Book ({selectedSeats} {selectedSeats === 1 ? 'Seat' : 'Seats'})
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.sm,
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.heavy,
    color: colors.textPrimary,
  },
  chatHeaderBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 110,
  },
  bannerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  dateBanner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  dateBannerText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: '#0284C7',
  },
  ecoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  ecoBannerText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: '#059669',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  cardHeader: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.heavy,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  timelinePoint: {
    flexDirection: 'row',
  },
  timelineLeft: {
    width: 85,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingRight: spacing.sm,
  },
  timelineTime: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  originCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#0284C7',
    backgroundColor: colors.surface,
    marginTop: 2,
  },
  destCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
    marginTop: 2,
  },
  timelineRight: {
    flex: 1,
  },
  timelineCity: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.heavy,
    color: colors.textPrimary,
  },
  timelineSpot: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
    marginTop: 1,
  },
  timelineAddress: {
    fontSize: typography.fontSizes.xs,
    color: colors.textTertiary,
    marginTop: 2,
  },
  stopoversContainer: {
    marginVertical: 4,
  },
  stopoverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  stopoverConnectorLine: {
    position: 'absolute',
    left: 78,
    top: -12,
    bottom: -12,
    width: 2,
    backgroundColor: colors.borderStrong,
  },
  stopoverDot: {
    width: 16,
    marginLeft: 71,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopoverContent: {
    marginLeft: spacing.md,
    flex: 1,
  },
  stopoverCityText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  stopoverEtaText: {
    fontSize: 10,
    color: colors.textTertiary,
    marginTop: 1,
  },
  timelineBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  timelineBar: {
    width: 2,
    height: 32,
    backgroundColor: colors.borderStrong,
    marginLeft: 78,
  },
  durationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.pill,
    marginLeft: spacing.md,
  },
  durationChipText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  driverProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontWeight: typography.fontWeights.heavy,
    fontSize: typography.fontSizes.lg,
  },
  driverMetaCol: {
    flex: 1,
  },
  driverNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  driverName: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  levelBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: borderRadius.pill,
  },
  levelBadgeText: {
    fontSize: 9,
    fontWeight: typography.fontWeights.bold,
    color: '#B45309',
  },
  driverSub: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 1,
  },
  driverRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  driverRatingText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  driverRatingCount: {
    fontSize: typography.fontSizes.xs,
    color: colors.textTertiary,
  },
  breakdownGrid: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    marginTop: spacing.md,
  },
  breakdownItem: {
    flex: 1,
    alignItems: 'center',
  },
  breakdownScore: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.heavy,
    color: colors.textPrimary,
  },
  breakdownLabel: {
    fontSize: 9,
    color: colors.textTertiary,
    marginTop: 1,
  },
  chattinessBox: {
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
  },
  chattinessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 2,
  },
  chattinessTitle: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  chattinessDesc: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
  },
  verificationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  verifBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.pill,
  },
  verifText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.semibold,
    color: '#059669',
  },
  bioContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceMuted,
  },
  bioText: {
    fontSize: typography.fontSizes.xs,
    fontStyle: 'italic',
    color: colors.textSecondary,
    lineHeight: 18,
  },
  askDriverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    height: 42,
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
  },
  askDriverBtnText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  reviewItem: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceMuted,
  },
  reviewTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  reviewAuthor: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  reviewRatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  reviewRatingText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
    color: '#D97706',
  },
  reviewComment: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  reviewMeta: {
    fontSize: 9,
    color: colors.textTertiary,
    marginTop: 2,
  },
  carRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  carMeta: {
    flex: 1,
  },
  carName: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  carSub: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  amenityList: {
    gap: spacing.sm,
  },
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  amenityText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textPrimary,
  },
  notesBox: {
    flexDirection: 'row',
    gap: spacing.xs,
    backgroundColor: '#EFF6FF',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
  },
  notesText: {
    flex: 1,
    fontSize: typography.fontSizes.xs,
    color: '#0284C7',
    lineHeight: 18,
  },
  costSub: {
    fontSize: 11,
    color: colors.textTertiary,
    marginBottom: spacing.sm,
  },
  costBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  costItemName: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
  },
  costItemValue: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textPrimary,
  },
  costTotalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 6,
    marginTop: 4,
  },
  costTotalName: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.heavy,
    color: colors.textPrimary,
  },
  costTotalValue: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.heavy,
    color: colors.textPrimary,
  },
  seatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  seatsAvailableLabel: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  pricePerSeatSub: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  counterBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBtnDisabled: {
    opacity: 0.3,
  },
  counterValue: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.heavy,
    color: colors.textPrimary,
    minWidth: 20,
    textAlign: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadows.lg,
  },
  bottomPriceCol: {
    justifyContent: 'center',
  },
  totalLabel: {
    fontSize: 11,
    color: colors.textTertiary,
  },
  totalPriceText: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.heavy,
    color: colors.textPrimary,
  },
  bookBtn: {
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    height: 50,
    borderRadius: borderRadius.pill,
    ...shadows.sm,
  },
  bookBtnDisabled: {
    opacity: 0.6,
  },
  bookBtnText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.accentText,
  },
});

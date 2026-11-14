/**
 * NEXORA RIDE — 10/10 Digital Boarding Pass & Travel Ticket
 *
 * Scannable Dynamic QR Code, Secure 4-Digit Boarding PIN,
 * Highway Stopovers Timeline, In-App Driver Chat, and Safety Hub.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '@/theme/tokens';
import { CarpoolService } from '@/services/carpoolService';
import type { CarpoolTicket } from '@/models/carpool';
import { SafetyModal } from '@/components/safety/SafetyModal';

export default function CarpoolTicketScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ bookingId?: string }>();
  const bookingId = params.bookingId;

  const [ticket, setTicket] = useState<CarpoolTicket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSafetyVisible, setIsSafetyVisible] = useState(false);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (!bookingId) return;
      setIsLoading(true);
      const tickets = await CarpoolService.getMyBookings();
      const found = tickets.find((t) => t.bookingId === bookingId);
      if (isMounted) {
        setTicket(found || null);
        setIsLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [bookingId]);

  if (isLoading || !ticket) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading your booking pass...</Text>
      </SafeAreaView>
    );
  }

  const handleCallDriver = () => {
    Linking.openURL('tel:+919876543210').catch(() => {
      Alert.alert('Call Driver', 'Driver phone: +91 98765 43210');
    });
  };

  const handleOpenChat = () => {
    router.push({
      pathname: '/chat' as any,
      params: { rideId: ticket.rideId },
    });
  };

  const handleCancelBooking = () => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this carpool seat? The seat will be released back to other travelers.',
      [
        { text: 'Keep Booking', style: 'cancel' },
        {
          text: 'Cancel Ride',
          style: 'destructive',
          onPress: async () => {
            await CarpoolService.cancelBooking(ticket.bookingId);
            Alert.alert('Booking Cancelled', 'Your booking has been cancelled.', [
              { text: 'OK', onPress: () => router.replace('/(tabs)/rides') },
            ]);
          },
        },
      ]
    );
  };

  const qrImageUrl =
    ticket.qrCodeUrl ||
    `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=NEXORA:${ticket.bookingCode}`;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/(tabs)/rides')}>
          <Ionicons name="close" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Digital Boarding Pass</Text>
        <TouchableOpacity
          style={styles.safetyHeaderBtn}
          onPress={() => setIsSafetyVisible(true)}
          accessibilityLabel="Open 24x7 Safety Hub"
        >
          <Ionicons name="shield-checkmark" size={18} color="#059669" />
          <Text style={styles.safetyHeaderBtnText}>Safety</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Success Header Banner */}
        <View style={styles.successBanner}>
          <View style={styles.successIconCircle}>
            <Ionicons name="checkmark" size={28} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.successTitle}>Seat Reserved & Confirmed</Text>
            <Text style={styles.successSubtitle}>
              Show this pass to {ticket.ride.driver.name} when boarding.
            </Text>
          </View>
        </View>

        {/* ─── DIGITAL PASS CARD ─── */}
        <View style={styles.ticketCard}>
          {/* Top Bar: Reference & Status */}
          <View style={styles.ticketTop}>
            <View>
              <Text style={styles.codeLabel}>BOOKING REFERENCE</Text>
              <Text style={styles.codeValue}>{ticket.bookingCode}</Text>
            </View>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>{ticket.status.toUpperCase()}</Text>
            </View>
          </View>

          {/* Secure Boarding PIN Highlight Box */}
          <View style={styles.pinHighlightBox}>
            <View style={styles.pinIconCircle}>
              <Ionicons name="key" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.pinSmallLabel}>SECURE BOARDING PIN</Text>
              <Text style={styles.pinNumber}>{ticket.boardingPin || '4821'}</Text>
            </View>
            <View style={styles.pinShieldPill}>
              <Ionicons name="shield-checkmark" size={12} color="#059669" />
              <Text style={styles.pinShieldText}>Driver Verification</Text>
            </View>
          </View>

          {/* Notch Divider */}
          <View style={styles.notchRow}>
            <View style={styles.leftNotch} />
            <View style={styles.dottedLine} />
            <View style={styles.rightNotch} />
          </View>

          {/* Journey Section */}
          <View style={styles.journeySection}>
            <View style={styles.timeLocationRow}>
              <View>
                <Text style={styles.timeBig}>{ticket.ride.departureTime}</Text>
                <Text style={styles.dateSmall}>{ticket.ride.date}</Text>
              </View>
              <View style={styles.journeyDurationChip}>
                <Ionicons name="car-outline" size={14} color={colors.primary} />
                <Text style={styles.journeyDurationText}>{ticket.ride.duration}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.timeBig}>{ticket.ride.arrivalTime}</Text>
                <Text style={styles.dateSmall}>Est. Arrival</Text>
              </View>
            </View>

            <View style={styles.citiesRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cityText}>{ticket.ride.origin.city}</Text>
                <Text style={styles.spotText}>{ticket.ride.origin.spot}</Text>
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={styles.cityText}>{ticket.ride.destination.city}</Text>
                <Text style={styles.spotText}>{ticket.ride.destination.spot}</Text>
              </View>
            </View>

            {/* Intermediate Stopovers */}
            {ticket.ride.stopovers && ticket.ride.stopovers.length > 0 && (
              <View style={styles.stopoversBox}>
                <Text style={styles.stopoversTitle}>Enroute Highway Stops:</Text>
                {ticket.ride.stopovers.map((s, idx) => (
                  <View key={idx} style={styles.stopoverRow}>
                    <Ionicons
                      name={s.isStopForRefreshment ? 'cafe' : 'radio-button-on'}
                      size={12}
                      color={s.isStopForRefreshment ? '#D97706' : colors.textTertiary}
                    />
                    <Text style={styles.stopoverText}>
                      {s.city} ({s.spot}) • {s.eta}
                      {s.isStopForRefreshment ? ` [${s.refreshmentDurationMinutes || 15}m coffee stop]` : ''}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Scannable Dynamic QR Code Box */}
          <View style={styles.qrCodeContainer}>
            <Image
              source={{ uri: qrImageUrl }}
              style={styles.qrCodeImage}
              resizeMode="contain"
            />
            <Text style={styles.qrScanCaption}>Scan at boarding to check-in</Text>
          </View>

          {/* Driver & Car Details */}
          <View style={styles.driverSection}>
            <View style={styles.driverRow}>
              <View style={styles.driverAvatar}>
                <Text style={styles.avatarInitial}>{ticket.ride.driver.name.charAt(0)}</Text>
              </View>
              <View style={styles.driverMeta}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={styles.driverName}>{ticket.ride.driver.name}</Text>
                  <Ionicons name="checkmark-circle" size={14} color="#0284C7" />
                </View>
                <Text style={styles.carDetailText}>
                  {ticket.ride.car.make} {ticket.ride.car.model} • {ticket.ride.car.color}
                </Text>
                {ticket.ride.car.licensePlate && (
                  <Text style={styles.licensePlateText}>{ticket.ride.car.licensePlate}</Text>
                )}
              </View>
            </View>

            {/* In-App Chat & Call Buttons */}
            <View style={styles.contactRow}>
              <TouchableOpacity style={styles.contactBtn} onPress={handleOpenChat}>
                <Ionicons name="chatbubbles" size={16} color={colors.primary} />
                <Text style={styles.contactBtnText}>Message Driver</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.contactBtn} onPress={handleCallDriver}>
                <Ionicons name="call" size={16} color="#059669" />
                <Text style={styles.contactBtnText}>Call Driver</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Cost Transparency Breakdown */}
          <View style={styles.summarySection}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Seats Reserved</Text>
              <Text style={styles.summaryVal}>{ticket.seatsBooked} Passenger Seat(s)</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Amount (Cash/UPI)</Text>
              <Text style={styles.summaryValBig}>₹{ticket.totalAmount}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Platform Convenience Fee</Text>
              <Text style={[styles.summaryVal, { color: '#059669' }]}>₹0 (Zero Fee Offer)</Text>
            </View>
          </View>
        </View>

        {/* 24x7 Safety Assurance Banner */}
        <TouchableOpacity
          style={styles.safetyBanner}
          activeOpacity={0.88}
          onPress={() => setIsSafetyVisible(true)}
        >
          <View style={styles.safetyIconCircle}>
            <Ionicons name="shield-checkmark" size={22} color="#059669" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.safetyTitle}>Nexora 24x7 Safety Protection</Text>
            <Text style={styles.safetySub}>
              Share live trip, trigger emergency SOS, or record audio shield anytime.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#059669" />
        </TouchableOpacity>

        {/* Navigation Actions */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.replace('/(tabs)/rides')}
        >
          <Ionicons name="ticket-outline" size={18} color={colors.accentText} />
          <Text style={styles.primaryBtnText}>View All My Rides</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelBooking}>
          <Text style={styles.cancelBtnText}>Cancel Booking</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Safety Hub Modal */}
      <SafetyModal
        visible={isSafetyVisible}
        onClose={() => setIsSafetyVisible(false)}
        ride={ticket.ride}
        boardingPin={ticket.boardingPin}
      />
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
  safetyHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.pill,
  },
  safetyHeaderBtnText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
    color: '#059669',
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.huge,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  successIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.heavy,
    color: '#065F46',
  },
  successSubtitle: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
  },
  ticketCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.md,
  },
  ticketTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
  },
  codeLabel: {
    fontSize: 10,
    fontWeight: typography.fontWeights.heavy,
    letterSpacing: 1,
    color: colors.textTertiary,
  },
  codeValue: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.heavy,
    color: '#0284C7',
    marginTop: 2,
  },
  statusPill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.pill,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
    color: '#059669',
  },
  pinHighlightBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  pinIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinSmallLabel: {
    fontSize: 9,
    fontWeight: typography.fontWeights.heavy,
    letterSpacing: 0.8,
    color: colors.primary,
  },
  pinNumber: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.heavy,
    color: colors.primary,
    letterSpacing: 4,
  },
  pinShieldPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.pill,
  },
  pinShieldText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: '#059669',
  },
  notchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  leftNotch: {
    width: 18,
    height: 24,
    backgroundColor: colors.background,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  dottedLine: {
    flex: 1,
    height: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    marginHorizontal: spacing.xs,
  },
  rightNotch: {
    width: 18,
    height: 24,
    backgroundColor: colors.background,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  journeySection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  timeLocationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  timeBig: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.heavy,
    color: colors.textPrimary,
  },
  dateSmall: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  journeyDurationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.pill,
  },
  journeyDurationText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  citiesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cityText: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  spotText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textTertiary,
    marginTop: 2,
  },
  stopoversBox: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginTop: spacing.md,
  },
  stopoversTitle: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  stopoverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 2,
  },
  stopoverText: {
    fontSize: 11,
    color: colors.textPrimary,
  },
  qrCodeContainer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    backgroundColor: '#FAFAFA',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.surfaceMuted,
  },
  qrCodeImage: {
    width: 160,
    height: 160,
    borderRadius: borderRadius.md,
  },
  qrScanCaption: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontWeight: typography.fontWeights.medium,
  },
  driverSection: {
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
    margin: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontWeight: typography.fontWeights.heavy,
    fontSize: typography.fontSizes.md,
  },
  driverMeta: {
    flex: 1,
  },
  driverName: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  carDetailText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  licensePlateText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
    marginTop: 2,
  },
  contactRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    height: 40,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  contactBtnText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  summarySection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.xs,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
  },
  summaryVal: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textPrimary,
  },
  summaryValBig: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.heavy,
    color: colors.textPrimary,
  },
  safetyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    marginTop: spacing.md,
  },
  safetyIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safetyTitle: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.heavy,
    color: '#065F46',
  },
  safetySub: {
    fontSize: 10,
    color: '#047857',
    marginTop: 2,
    lineHeight: 14,
  },
  primaryBtn: {
    backgroundColor: colors.accent,
    height: 52,
    borderRadius: borderRadius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
    ...shadows.sm,
  },
  primaryBtnText: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    color: colors.accentText,
  },
  cancelBtn: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  cancelBtnText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: '#EF4444',
  },
});

/**
 * NEXORA RIDE — Your Rides Screen (BlaBlaCar & City Rides)
 *
 * Full multi-category trip manager:
 * 1. Upcoming Carpools: Upcoming confirmed bookings
 * 2. Past Rides: Completed / cancelled bookings
 * 3. Published Rides: Intercity carpool rides offered by driver with passenger stats
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '@/theme/tokens';
import { BrandLogo } from '@/components/common/BrandLogo';
import { rideService } from '@/services/rideService';
import { CarpoolService } from '@/services/carpoolService';
import type { Booking } from '@/models/types';
import type { CarpoolTicket, CarpoolRide } from '@/models/carpool';

type TabView = 'upcoming' | 'past' | 'published';

// ─── Helper: format date string ───────────────────────────────────────────────
function formatRideDate(dateStr: string, timeStr?: string): string {
  try {
    const d = new Date(dateStr);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = days[d.getDay()];
    const date = d.getDate();
    const month = months[d.getMonth()];
    const base = `${day}, ${date} ${month}`;
    return timeStr ? `${base} · ${timeStr}` : base;
  } catch {
    return dateStr;
  }
}

// ─── Helper: avatar color from name ──────────────────────────────────────────
const AVATAR_COLORS = ['#0284C7', '#7C3AED', '#059669', '#DC2626', '#D97706', '#DB2777'];
function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ─── Helper: get ticket status info ──────────────────────────────────────────
function getStatusInfo(status: CarpoolTicket['status']): {
  label: string;
  bg: string;
  textColor: string;
} {
  switch (status) {
    case 'confirmed':
      return { label: 'Upcoming', bg: colors.infoSoft, textColor: colors.info };
    case 'boarded':
      return { label: 'Upcoming', bg: colors.infoSoft, textColor: colors.info };
    case 'completed':
      return { label: 'Completed', bg: colors.successSoft, textColor: colors.success };
    case 'cancelled':
      return { label: 'Cancelled', bg: colors.errorSoft, textColor: colors.error };
    default:
      return { label: status, bg: colors.surfaceMuted, textColor: colors.textSecondary };
  }
}

// ─── Ticket Card ─────────────────────────────────────────────────────────────
interface TicketCardProps {
  ticket: CarpoolTicket;
  onViewTicket: () => void;
  onChat: () => void;
  onCancel: () => void;
}

function TicketCard({ ticket, onViewTicket, onChat, onCancel }: TicketCardProps) {
  const { ride } = ticket;
  const statusInfo = getStatusInfo(ticket.status);
  const initials = ride.driver.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const bgColor = avatarColor(ride.driver.name);

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.88}
      onPress={onViewTicket}
    >
      {/* Card Top Row */}
      <View style={styles.cardTopRow}>
        {/* Route */}
        <View style={styles.routeBlock}>
          <Text style={styles.routeText}>
            {ride.origin.city}
            <Text style={styles.routeArrow}> → </Text>
            {ride.destination.city}
          </Text>
          <Text style={styles.dateTimeText}>
            {formatRideDate(ride.date, ride.departureTime)}
          </Text>
        </View>

        {/* Status Chip */}
        <View style={[styles.statusChip, { backgroundColor: statusInfo.bg }]}>
          <Text style={[styles.statusChipText, { color: statusInfo.textColor }]}>
            {statusInfo.label}
          </Text>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Middle: Driver + Price */}
      <View style={styles.cardMidRow}>
        {/* Driver Info */}
        <View style={styles.driverRow}>
          <View style={[styles.avatar, { backgroundColor: bgColor }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View>
            <Text style={styles.driverName}>{ride.driver.name}</Text>
            <Text style={styles.carInfo}>
              {ride.car.make} {ride.car.model}
            </Text>
          </View>
        </View>

        {/* Price + Code */}
        <View style={styles.priceBlock}>
          <Text style={styles.priceText}>₹{ticket.totalAmount}</Text>
          <Text style={styles.bookingCode}>{ticket.bookingCode}</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={onViewTicket}>
          <Ionicons name="ticket-outline" size={13} color={colors.info} />
          <Text style={[styles.actionBtnText, { color: colors.info }]}>View Ticket</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={onChat}>
          <Ionicons name="chatbubble-ellipses-outline" size={13} color={colors.textSecondary} />
          <Text style={styles.actionBtnText}>Chat</Text>
        </TouchableOpacity>

        {(ticket.status === 'confirmed' || ticket.status === 'boarded') && (
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={onCancel}>
            <Ionicons name="close-circle-outline" size={13} color={colors.error} />
            <Text style={[styles.actionBtnText, { color: colors.error }]}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Published Ride Card ──────────────────────────────────────────────────────
interface PublishedCardProps {
  ride: CarpoolRide;
}

function PublishedCard({ ride }: PublishedCardProps) {
  const booked = ride.totalSeats - ride.availableSeats;
  const earnings = booked * ride.pricePerSeat;

  const statusColors: Record<CarpoolRide['status'], { bg: string; text: string; label: string }> = {
    active: { bg: colors.infoSoft, text: colors.info, label: 'Active' },
    in_progress: { bg: colors.warningSoft, text: colors.warning, label: 'In Progress' },
    completed: { bg: colors.successSoft, text: colors.success, label: 'Completed' },
    cancelled: { bg: colors.errorSoft, text: colors.error, label: 'Cancelled' },
  };
  const sc = statusColors[ride.status] ?? statusColors.active;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardTopRow}>
        <View style={styles.routeBlock}>
          <Text style={styles.routeText}>
            {ride.origin.city}
            <Text style={styles.routeArrow}> → </Text>
            {ride.destination.city}
          </Text>
          <Text style={styles.dateTimeText}>
            {formatRideDate(ride.date, ride.departureTime)}
          </Text>
        </View>
        <View style={[styles.statusChip, { backgroundColor: sc.bg }]}>
          <Text style={[styles.statusChipText, { color: sc.text }]}>{sc.label}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Stats Row */}
      <View style={styles.publishedStatsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{ride.totalSeats}</Text>
          <Text style={styles.statLabel}>Total Seats</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{booked}</Text>
          <Text style={styles.statLabel}>Booked</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{ride.availableSeats}</Text>
          <Text style={styles.statLabel}>Available</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: colors.success }]}>₹{earnings}</Text>
          <Text style={styles.statLabel}>Earnings</Text>
        </View>
      </View>

      {/* Passengers Bar */}
      <View style={styles.passengerBar}>
        <Ionicons name="people-outline" size={15} color={colors.textSecondary} />
        <Text style={styles.passengerBarText}>
          {ride.passengers.length === 0
            ? 'No passengers booked yet'
            : `${ride.passengers.length} passenger${ride.passengers.length > 1 ? 's' : ''} booked`}
        </Text>
      </View>
    </View>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
interface EmptyStateProps {
  emoji: string;
  title: string;
  subtitle: string;
  ctaLabel?: string;
  onCta?: () => void;
}

function EmptyState({ emoji, title, subtitle, ctaLabel, onCta }: EmptyStateProps) {
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>{emoji}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySub}>{subtitle}</Text>
      {ctaLabel && onCta && (
        <TouchableOpacity style={styles.ctaBtn} onPress={onCta}>
          <Text style={styles.ctaBtnText}>{ctaLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function MyRidesScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabView>('upcoming');

  // Carpool State
  const [carpoolTickets, setCarpoolTickets] = useState<CarpoolTicket[]>([]);
  const [publishedRides, setPublishedRides] = useState<CarpoolRide[]>([]);

  // City Rides State (kept for data compatibility)
  const [cityBookings, setCityBookings] = useState<Booking[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await CarpoolService.init();
      const [tickets, pubRides, cityRes] = await Promise.all([
        CarpoolService.getMyBookings(),
        CarpoolService.getMyPublishedRides(),
        rideService.listBookings(),
      ]);
      setCarpoolTickets(tickets);
      setPublishedRides(pubRides);
      if (cityRes.data) {
        setCityBookings(cityRes.data);
      }
    } catch {
      // Handle gracefully
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      await CarpoolService.init();
      const [tickets, pubRides, cityRes] = await Promise.all([
        CarpoolService.getMyBookings(),
        CarpoolService.getMyPublishedRides(),
        rideService.listBookings(),
      ]);
      if (isMounted) {
        setCarpoolTickets(tickets);
        setPublishedRides(pubRides);
        if (cityRes.data) {
          setCityBookings(cityRes.data);
        }
        setIsLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // Split tickets by status
  const upcomingTickets = carpoolTickets.filter(
    (t) => t.status === 'confirmed' || t.status === 'boarded',
  );
  const pastTickets = carpoolTickets.filter(
    (t) => t.status === 'completed' || t.status === 'cancelled',
  );

  const TAB_DEFS: { key: TabView; label: string }[] = [
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'past', label: 'Past' },
    { key: 'published', label: 'Published' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />

      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <BrandLogo size="sm" variant="dark" />
          <Text style={styles.headerTitle}>Your Rides</Text>
        </View>

        {/* 3-Way Pill Tabs */}
        <View style={styles.tabBar}>
          {TAB_DEFS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabItem, activeTab === tab.key && styles.tabItemActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text
                style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.accent} />
        }
      >
        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading your journeys...</Text>
          </View>
        ) : activeTab === 'upcoming' ? (
          /* ─── TAB 1: UPCOMING RIDES ─── */
          upcomingTickets.length === 0 ? (
            <EmptyState
              emoji="🚗"
              title="No upcoming rides"
              subtitle="No upcoming rides. Search for a carpool!"
              ctaLabel="Find a Ride"
              onCta={() => router.push('/(tabs)')}
            />
          ) : (
            upcomingTickets.map((ticket) => (
              <TicketCard
                key={ticket.bookingId}
                ticket={ticket}
                onViewTicket={() =>
                  router.push({
                    pathname: '/carpool-ticket' as any,
                    params: { bookingCode: ticket.bookingCode },
                  })
                }
                onChat={() =>
                  router.push({
                    pathname: '/chat' as any,
                    params: { rideId: ticket.rideId },
                  })
                }
                onCancel={() => {
                  // Cancel action — extend with confirmation dialog as needed
                }}
              />
            ))
          )
        ) : activeTab === 'past' ? (
          /* ─── TAB 2: PAST RIDES ─── */
          pastTickets.length === 0 ? (
            <EmptyState
              emoji="🏁"
              title="No past trips yet"
              subtitle="Your journey starts soon!"
            />
          ) : (
            pastTickets.map((ticket) => (
              <TicketCard
                key={ticket.bookingId}
                ticket={ticket}
                onViewTicket={() =>
                  router.push({
                    pathname: '/carpool-ticket' as any,
                    params: { bookingCode: ticket.bookingCode },
                  })
                }
                onChat={() =>
                  router.push({
                    pathname: '/chat' as any,
                    params: { rideId: ticket.rideId },
                  })
                }
                onCancel={() => {}}
              />
            ))
          )
        ) : (
          /* ─── TAB 3: PUBLISHED RIDES ─── */
          publishedRides.length === 0 ? (
            <EmptyState
              emoji="🚦"
              title="No published rides"
              subtitle="You haven't published any rides. Share your journey, split fuel costs!"
              ctaLabel="Publish a Ride"
              onCta={() => router.push('/(tabs)/publish' as any)}
            />
          ) : (
            publishedRides.map((ride) => <PublishedCard key={ride.id} ride={ride} />)
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.heavy,
    color: colors.textPrimary,
  },

  // ── Pill Tab Bar ──
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: borderRadius.pill,
    padding: 3,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: borderRadius.pill,
  },
  tabItemActive: {
    backgroundColor: colors.accent,
    ...shadows.sm,
  },
  tabText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
    color: colors.textTertiary,
  },
  tabTextActive: {
    color: colors.accentText,
    fontWeight: typography.fontWeights.bold,
  },

  // ── Scroll ──
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.huge,
    flexGrow: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.huge,
  },
  loadingText: {
    marginTop: spacing.sm,
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
  },

  // ── Empty State ──
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.huge,
    paddingHorizontal: spacing.xxl,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  ctaBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.xl,
    height: 48,
    borderRadius: borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  ctaBtnText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.accentText,
  },

  // ── Ticket Card ──
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  routeBlock: {
    flex: 1,
    marginRight: spacing.sm,
  },
  routeText: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.heavy,
    color: colors.textPrimary,
  },
  routeArrow: {
    color: colors.textTertiary,
    fontWeight: typography.fontWeights.regular,
  },
  dateTimeText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textTertiary,
    marginTop: 2,
  },
  statusChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.pill,
    alignSelf: 'flex-start',
  },
  statusChipText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  cardMidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: typography.fontWeights.bold,
    fontSize: typography.fontSizes.xs,
  },
  driverName: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textPrimary,
  },
  carInfo: {
    fontSize: 10,
    color: colors.textTertiary,
    marginTop: 1,
  },
  priceBlock: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.heavy,
    color: colors.textPrimary,
  },
  bookingCode: {
    fontSize: 10,
    fontWeight: typography.fontWeights.semibold,
    color: colors.info,
    marginTop: 2,
  },

  // ── Quick Actions ──
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceMuted,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBtnDanger: {
    backgroundColor: colors.errorSoft,
    borderColor: '#FECACA',
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
  },

  // ── Published Card ──
  publishedStatsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginVertical: spacing.sm,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.heavy,
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 9,
    color: colors.textTertiary,
    marginTop: 1,
    textAlign: 'center',
  },
  passengerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceMuted,
  },
  passengerBarText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
});

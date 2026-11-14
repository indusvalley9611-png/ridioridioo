/**
 * NEXORA RIDE — BlaBlaCar-level Carpool Search Results
 *
 * Features:
 * - Shimmer skeleton loaders (Animated, no 3rd-party)
 * - Rich RideCards with avatar, rating, verified badge, amenity chips, etc.
 * - Sticky filter tab bar (All | Earliest | Cheapest | Top Rated | Instant)
 * - Horizontal date strip
 * - Pull-to-refresh
 * - Empty state with Change Date CTA
 * - Back button with safe navigation
 */

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Animated,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '@/theme/tokens';
import { CarpoolService } from '@/services/carpoolService';
import type { CarpoolRide } from '@/models/carpool';

// ─── Avatar colour palette (derived from name) ───────────────────────────────
const AVATAR_COLORS = [
  '#0284C7', '#059669', '#7C3AED', '#DB2777', '#D97706',
  '#0891B2', '#16A34A', '#6D28D9', '#BE185D', '#B45309',
];
function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// ─── Skeleton Loader ─────────────────────────────────────────────────────────
function RideCardSkeleton() {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View style={[skStyles.card, { opacity }]}>
      <View style={skStyles.topRow}>
        <View style={skStyles.avatar} />
        <View style={skStyles.nameBlock}>
          <View style={skStyles.lineWide} />
          <View style={skStyles.lineNarrow} />
        </View>
        <View style={skStyles.pricePlaceholder} />
      </View>
      <View style={skStyles.divider} />
      <View style={skStyles.routeRow}>
        <View style={skStyles.cityBlock}>
          <View style={[skStyles.lineWide, { width: 70 }]} />
          <View style={[skStyles.lineNarrow, { width: 50 }]} />
        </View>
        <View style={skStyles.arrowPlaceholder} />
        <View style={skStyles.cityBlock}>
          <View style={[skStyles.lineWide, { width: 70 }]} />
          <View style={[skStyles.lineNarrow, { width: 50 }]} />
        </View>
      </View>
      <View style={skStyles.chipsRow}>
        <View style={skStyles.chip} />
        <View style={skStyles.chip} />
        <View style={skStyles.chip} />
      </View>
    </Animated.View>
  );
}

const skStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceMuted },
  nameBlock: { flex: 1, marginLeft: spacing.md, gap: 6 },
  lineWide: { height: 12, borderRadius: 6, backgroundColor: colors.surfaceMuted, width: 110 },
  lineNarrow: { height: 10, borderRadius: 5, backgroundColor: colors.surfaceMuted, width: 80 },
  pricePlaceholder: { width: 55, height: 28, borderRadius: borderRadius.md, backgroundColor: colors.surfaceMuted },
  divider: { height: 1, backgroundColor: colors.border, marginBottom: spacing.md },
  routeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  cityBlock: { gap: 6 },
  arrowPlaceholder: { width: 24, height: 12, borderRadius: 6, backgroundColor: colors.surfaceMuted },
  chipsRow: { flexDirection: 'row', gap: spacing.xs },
  chip: { width: 56, height: 22, borderRadius: borderRadius.pill, backgroundColor: colors.surfaceMuted },
});

// ─── Rich Ride Card ───────────────────────────────────────────────────────────
interface RideCardProps {
  ride: CarpoolRide;
  onPress: () => void;
}

function RideCard({ ride, onPress }: RideCardProps) {
  const avatarColor = getAvatarColor(ride.driver.name);
  const initials = getInitials(ride.driver.name);
  const seatsLeft = ride.availableSeats;
  const lowSeats = seatsLeft <= 2;

  const amenities: Array<{ icon: string; label: string }> = [
    ride.amenities.ac && { icon: '❄️', label: 'AC' },
    ride.amenities.musicAllowed && { icon: '🎵', label: 'Music' },
    (ride.amenities.luggageSize === 'large' || ride.amenities.luggageSize === 'medium') && { icon: '🧳', label: 'Luggage' },
    ride.amenities.ladiesOnly && { icon: '👩', label: 'Ladies Only' },
    ride.isInstantBooking && { icon: '⚡', label: 'Instant' },
  ].filter(Boolean) as Array<{ icon: string; label: string }>;

  return (
    <TouchableOpacity style={cardStyles.card} onPress={onPress} activeOpacity={0.88}>
      {/* Top Row: Avatar + Driver Info + Price */}
      <View style={cardStyles.topRow}>
        <View style={[cardStyles.avatarCircle, { backgroundColor: avatarColor }]}>
          <Text style={cardStyles.avatarText}>{initials}</Text>
        </View>

        <View style={cardStyles.driverInfo}>
          <View style={cardStyles.driverNameRow}>
            <Text style={cardStyles.driverName} numberOfLines={1}>{ride.driver.name}</Text>
            {ride.driver.isIdVerified && (
              <View style={cardStyles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={11} color="#059669" />
                <Text style={cardStyles.verifiedText}>Verified</Text>
              </View>
            )}
          </View>
          <View style={cardStyles.ratingRow}>
            <Ionicons name="star" size={12} color="#F59E0B" />
            <Text style={cardStyles.ratingText}>{ride.driver.rating.toFixed(1)}</Text>
            <Text style={cardStyles.tripCount}>• {ride.driver.tripsCompleted} trips</Text>
          </View>
        </View>

        <View style={cardStyles.priceBlock}>
          <Text style={cardStyles.price}>₹{ride.pricePerSeat}</Text>
          <Text style={cardStyles.perSeat}>per seat</Text>
        </View>
      </View>

      {/* Divider */}
      <View style={cardStyles.divider} />

      {/* Route Timeline */}
      <View style={cardStyles.routeRow}>
        <View style={cardStyles.routeEndpoint}>
          <Text style={cardStyles.routeTime}>{ride.departureTime}</Text>
          <Text style={cardStyles.routeCity} numberOfLines={1}>{ride.origin.city}</Text>
        </View>

        <View style={cardStyles.routeMiddle}>
          <View style={cardStyles.routeLineLeft} />
          <View style={cardStyles.durationChip}>
            <Ionicons name="time-outline" size={10} color={colors.textSecondary} />
            <Text style={cardStyles.durationText}>{ride.duration}</Text>
          </View>
          <View style={cardStyles.routeLineRight} />
          <Ionicons name="arrow-forward" size={14} color={colors.textTertiary} style={cardStyles.arrowIcon} />
        </View>

        <View style={[cardStyles.routeEndpoint, { alignItems: 'flex-end' }]}>
          <Text style={cardStyles.routeTime}>{ride.arrivalTime}</Text>
          <Text style={cardStyles.routeCity} numberOfLines={1}>{ride.destination.city}</Text>
        </View>
      </View>

      {/* Bottom Row: Seats + Amenity Chips */}
      <View style={cardStyles.bottomRow}>
        <View style={[cardStyles.seatsBadge, lowSeats && cardStyles.seatsBadgeLow]}>
          <Ionicons name="people" size={12} color={lowSeats ? '#D97706' : colors.textSecondary} />
          <Text style={[cardStyles.seatsText, lowSeats && cardStyles.seatsTextLow]}>
            {seatsLeft} {seatsLeft === 1 ? 'seat' : 'seats'} left
          </Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={cardStyles.amenityScroll}>
          {amenities.map((a) => (
            <View key={a.label} style={cardStyles.amenityChip}>
              <Text style={cardStyles.amenityEmoji}>{a.icon}</Text>
              <Text style={cardStyles.amenityLabel}>{a.label}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </TouchableOpacity>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  avatarCircle: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: typography.fontWeights.heavy,
    fontSize: typography.fontSizes.sm,
  },
  driverInfo: { flex: 1 },
  driverNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  driverName: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 5, paddingVertical: 2,
    borderRadius: borderRadius.pill,
  },
  verifiedText: { fontSize: 9, fontWeight: typography.fontWeights.semibold, color: '#059669' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  ratingText: { fontSize: typography.fontSizes.xs, fontWeight: typography.fontWeights.bold, color: colors.textPrimary },
  tripCount: { fontSize: typography.fontSizes.xs, color: colors.textTertiary },
  priceBlock: { alignItems: 'flex-end' },
  price: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.heavy,
    color: colors.accentText,
    backgroundColor: colors.accent,
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  perSeat: { fontSize: 9, color: colors.textTertiary, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.border, marginBottom: spacing.md },
  routeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  routeEndpoint: { flex: 2 },
  routeTime: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.heavy,
    color: colors.textPrimary,
  },
  routeCity: { fontSize: typography.fontSizes.xs, color: colors.textSecondary, marginTop: 2 },
  routeMiddle: {
    flex: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  routeLineLeft: { flex: 1, height: 1, backgroundColor: colors.borderStrong },
  routeLineRight: { flex: 1, height: 1, backgroundColor: colors.borderStrong },
  arrowIcon: { marginLeft: 2 },
  durationChip: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 6, paddingVertical: 3,
    borderRadius: borderRadius.pill,
    marginHorizontal: 4,
  },
  durationText: { fontSize: 9, color: colors.textSecondary, fontWeight: typography.fontWeights.medium },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  seatsBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: borderRadius.pill,
  },
  seatsBadgeLow: { backgroundColor: '#FFFBEB' },
  seatsText: { fontSize: 10, fontWeight: typography.fontWeights.semibold, color: colors.textSecondary },
  seatsTextLow: { color: '#D97706' },
  amenityScroll: { flex: 1 },
  amenityChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: borderRadius.pill,
    marginRight: 4,
  },
  amenityEmoji: { fontSize: 10 },
  amenityLabel: { fontSize: 9, color: colors.textSecondary, fontWeight: typography.fontWeights.medium },
});

// ─── Filter Tab definitions ───────────────────────────────────────────────────
type SortFilter = 'all' | 'earliest' | 'cheapest' | 'toprated' | 'instant';
const FILTER_TABS: Array<{ key: SortFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'earliest', label: '🕐 Earliest' },
  { key: 'cheapest', label: '💰 Cheapest' },
  { key: 'toprated', label: '⭐ Top Rated' },
  { key: 'instant', label: '⚡ Instant' },
];

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function CarpoolResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    origin?: string;
    destination?: string;
    date?: string;
    seats?: string;
    filter?: 'all' | 'instant' | 'max2' | 'ladies';
  }>();

  const originQuery = params.origin || 'Bangalore';
  const destinationQuery = params.destination || 'Chennai';
  const seatsCount = parseInt(params.seats || '1', 10);

  // ── Date options (next 6 days) ──
  const dateOptions = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const list = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getTime() + i * 86400000);
      list.push({
        label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`,
        shortDay: days[d.getDay()],
        shortDate: `${d.getDate()} ${months[d.getMonth()]}`,
        iso: d.toISOString().split('T')[0],
      });
    }
    return list;
  }, []);

  const [selectedDate, setSelectedDate] = useState(params.date || dateOptions[0].iso);
  const [sortFilter, setSortFilter] = useState<SortFilter>('all');
  const [rides, setRides] = useState<CarpoolRide[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchRides = useCallback(
    async (refreshing = false) => {
      if (refreshing) setIsRefreshing(true);
      else setIsLoading(true);

      await CarpoolService.init();
      const results = await CarpoolService.searchRides(
        originQuery,
        destinationQuery,
        selectedDate,
        seatsCount,
        'all'
      );
      setRides(results);
      if (refreshing) setIsRefreshing(false);
      else setIsLoading(false);
    },
    [originQuery, destinationQuery, selectedDate, seatsCount]
  );

  useEffect(() => {
    let isMounted = true;
    (async () => {
      setIsLoading(true);
      await CarpoolService.init();
      const results = await CarpoolService.searchRides(
        originQuery,
        destinationQuery,
        selectedDate,
        seatsCount,
        'all'
      );
      if (isMounted) {
        setRides(results);
        setIsLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [originQuery, destinationQuery, selectedDate, seatsCount]);

  const filteredAndSortedRides = useMemo(() => {
    let list = [...rides];
    if (sortFilter === 'instant') {
      list = list.filter((r) => r.isInstantBooking);
    } else if (sortFilter === 'cheapest') {
      list.sort((a, b) => a.pricePerSeat - b.pricePerSeat);
    } else if (sortFilter === 'toprated') {
      list.sort((a, b) => b.driver.rating - a.driver.rating);
    } else if (sortFilter === 'earliest') {
      list.sort((a, b) => a.departureTime.localeCompare(b.departureTime));
    }
    return list;
  }, [rides, sortFilter]);

  const handleSelectRide = (ride: CarpoolRide) => {
    router.push({
      pathname: '/carpool-detail' as any,
      params: { rideId: ride.id, seats: seatsCount.toString() },
    });
  };

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerRoute} numberOfLines={1}>
            {originQuery} → {destinationQuery}
          </Text>
          <Text style={styles.headerDate}>
            {seatsCount} {seatsCount === 1 ? 'passenger' : 'passengers'} •{' '}
            {isLoading ? '...' : `${filteredAndSortedRides.length} rides`}
          </Text>
        </View>
        <TouchableOpacity style={styles.searchEditBtn} onPress={handleBack} accessibilityLabel="Edit search">
          <Ionicons name="options-outline" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* ── Date Strip ── */}
      <View style={styles.dateStripContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateStripContent}>
          {dateOptions.map((opt) => {
            const isSelected = selectedDate === opt.iso;
            return (
              <TouchableOpacity
                key={opt.iso}
                style={[styles.dateChip, isSelected && styles.dateChipActive]}
                onPress={() => setSelectedDate(opt.iso)}
              >
                <Text style={[styles.dateChipDay, isSelected && styles.dateChipDayActive]}>
                  {opt.shortDay}
                </Text>
                <Text style={[styles.dateChipNum, isSelected && styles.dateChipNumActive]}>
                  {opt.shortDate}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Sticky Filter Tab Bar ── */}
      <View style={styles.filterTabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterTabContent}>
          {FILTER_TABS.map((tab) => {
            const isActive = sortFilter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.filterTab, isActive && styles.filterTabActive]}
                onPress={() => setSortFilter(tab.key)}
              >
                <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Safety Pill ── */}
      <View style={styles.safetyPill}>
        <Ionicons name="shield-checkmark" size={13} color="#059669" />
        <Text style={styles.safetyText}>
          Every driver verified • Govt ID • Background check • Zero surge
        </Text>
      </View>

      {/* ── Main Content ── */}
      {isLoading ? (
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          <RideCardSkeleton />
          <RideCardSkeleton />
          <RideCardSkeleton />
        </ScrollView>
      ) : filteredAndSortedRides.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🚗</Text>
          <Text style={styles.emptyTitle}>No rides found on this route.</Text>
          <Text style={styles.emptySub}>Try a nearby date.</Text>
          <TouchableOpacity
            style={styles.changeDateBtn}
            onPress={() => setSelectedDate(dateOptions[1].iso)}
          >
            <Text style={styles.changeDateText}>Change Date</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredAndSortedRides}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchRides(true)}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          renderItem={({ item }) => (
            <RideCard ride={item} onPress={() => handleSelectRide(item)} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitleContainer: { flex: 1, marginHorizontal: spacing.md },
  headerRoute: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.heavy,
    color: colors.textPrimary,
  },
  headerDate: { fontSize: typography.fontSizes.xs, color: colors.textSecondary, marginTop: 2 },
  searchEditBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  dateStripContainer: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.xs,
  },
  dateStripContent: { paddingHorizontal: spacing.lg, gap: spacing.xs },
  dateChip: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: borderRadius.lg, alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  dateChipActive: { backgroundColor: colors.primary },
  dateChipDay: { fontSize: 10, fontWeight: typography.fontWeights.semibold, color: colors.textTertiary },
  dateChipDayActive: { color: colors.accent },
  dateChipNum: {
    fontSize: typography.fontSizes.xs, fontWeight: typography.fontWeights.heavy,
    color: colors.textPrimary, marginTop: 1,
  },
  dateChipNumActive: { color: '#FFFFFF' },
  filterTabBar: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.xs,
  },
  filterTabContent: { paddingHorizontal: spacing.lg, gap: spacing.xs },
  filterTab: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  filterTabActive: { backgroundColor: colors.accent },
  filterTabText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
  },
  filterTabTextActive: { color: colors.accentText, fontWeight: typography.fontWeights.bold },
  safetyPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#ECFDF5',
    marginHorizontal: spacing.lg, marginTop: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: 5,
    borderRadius: borderRadius.pill,
  },
  safetyText: { fontSize: 10, color: '#065F46', fontWeight: typography.fontWeights.medium, flex: 1 },
  listContent: { padding: spacing.lg, paddingBottom: spacing.huge },
  emptyContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  emptyIcon: { fontSize: 54, marginBottom: spacing.md },
  emptyTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  changeDateBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.pill,
    ...shadows.sm,
  },
  changeDateText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.accentText,
  },
});

/**
 * NEXORA RIDE — Your Rides Screen (BlaBlaCar & City Rides)
 *
 * Full multi-category trip manager:
 * 1. Booked Carpools: Intercity carpool seats reserved by passenger with digital pass
 * 2. Published Rides: Intercity carpool rides offered by driver with passenger stats
 * 3. City Taxis: Urban on-demand rides (Bike / Auto / Cab) from Phase 3
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

type TabView = 'carpools' | 'published' | 'city';

export default function MyRidesScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabView>('carpools');

  // Carpool State
  const [carpoolTickets, setCarpoolTickets] = useState<CarpoolTicket[]>([]);
  const [publishedRides, setPublishedRides] = useState<CarpoolRide[]>([]);

  // City Rides State
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

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />

      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <BrandLogo size="sm" variant="dark" />
          <Text style={styles.headerTitle}>Your Rides</Text>
        </View>

        {/* 3-Way Segment Tabs */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'carpools' && styles.tabItemActive]}
            onPress={() => setActiveTab('carpools')}
          >
            <Ionicons
              name="ticket"
              size={14}
              color={activeTab === 'carpools' ? colors.primary : colors.textTertiary}
            />
            <Text
              style={[styles.tabText, activeTab === 'carpools' && styles.tabTextActive]}
            >
              Booked ({carpoolTickets.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'published' && styles.tabItemActive]}
            onPress={() => setActiveTab('published')}
          >
            <Ionicons
              name="car-sport"
              size={14}
              color={activeTab === 'published' ? colors.primary : colors.textTertiary}
            />
            <Text
              style={[styles.tabText, activeTab === 'published' && styles.tabTextActive]}
            >
              Published ({publishedRides.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'city' && styles.tabItemActive]}
            onPress={() => setActiveTab('city')}
          >
            <Ionicons
              name="bicycle"
              size={14}
              color={activeTab === 'city' ? colors.primary : colors.textTertiary}
            />
            <Text style={[styles.tabText, activeTab === 'city' && styles.tabTextActive]}>
              City Taxi ({cityBookings.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading your journeys...</Text>
          </View>
        ) : activeTab === 'carpools' ? (
          /* ─── TAB 1: BOOKED CARPOOLS ─── */
          carpoolTickets.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="ticket-outline" size={56} color={colors.textTertiary} />
              <Text style={styles.emptyTitle}>No carpool bookings yet</Text>
              <Text style={styles.emptySub}>
                Planning a trip between cities? Find low price rides with verified co-travelers.
              </Text>
              <TouchableOpacity
                style={styles.ctaBtn}
                onPress={() => router.push('/(tabs)')}
              >
                <Ionicons name="search" size={16} color={colors.accentText} />
                <Text style={styles.ctaBtnText}>Find a Ride</Text>
              </TouchableOpacity>
            </View>
          ) : (
            carpoolTickets.map((ticket) => (
              <TouchableOpacity
                key={ticket.bookingId}
                style={styles.card}
                activeOpacity={0.88}
                onPress={() =>
                  router.push({
                    pathname: '/carpool-ticket' as any,
                    params: { bookingId: ticket.bookingId },
                  })
                }
              >
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.bookingRefText}>{ticket.bookingCode}</Text>
                    <Text style={styles.dateText}>{ticket.ride.date}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      ticket.status === 'confirmed' ? styles.statusConfirmed : styles.statusCancelled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        ticket.status === 'confirmed'
                          ? styles.statusConfirmedText
                          : styles.statusCancelledText,
                      ]}
                    >
                      {ticket.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Route Row */}
                <View style={styles.routeRow}>
                  <View style={styles.timeRoute}>
                    <Text style={styles.timeText}>{ticket.ride.departureTime}</Text>
                    <Ionicons name="arrow-forward" size={14} color={colors.textTertiary} />
                    <Text style={styles.timeText}>{ticket.ride.arrivalTime}</Text>
                  </View>
                  <Text style={styles.citiesText}>
                    {ticket.ride.origin.city} → {ticket.ride.destination.city}
                  </Text>
                </View>

                {/* Driver & Total Amount */}
                <View style={styles.cardFooter}>
                  <View style={styles.driverSnippet}>
                    <View style={styles.miniAvatar}>
                      <Text style={styles.miniAvatarText}>
                        {ticket.ride.driver.name.charAt(0)}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.driverSnippetName}>
                        {ticket.ride.driver.name}
                      </Text>
                      <Text style={styles.driverSnippetCar}>
                        {ticket.ride.car.make} {ticket.ride.car.model}
                      </Text>
                    </View>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.priceSnippet}>₹{ticket.totalAmount}</Text>
                    <Text style={styles.seatsSnippet}>
                      {ticket.seatsBooked} {ticket.seatsBooked === 1 ? 'seat' : 'seats'}
                    </Text>
                  </View>
                </View>

                <View style={styles.viewPassBar}>
                  <Text style={styles.viewPassText}>View Boarding Pass</Text>
                  <Ionicons name="chevron-forward" size={14} color="#0284C7" />
                </View>
              </TouchableOpacity>
            ))
          )
        ) : activeTab === 'published' ? (
          /* ─── TAB 2: PUBLISHED RIDES ─── */
          publishedRides.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="car-sport-outline" size={56} color={colors.textTertiary} />
              <Text style={styles.emptyTitle}>No published rides</Text>
              <Text style={styles.emptySub}>
                Got empty seats in your car? Share travel costs with co-passengers.
              </Text>
              <TouchableOpacity
                style={styles.ctaBtn}
                onPress={() => router.push('/(tabs)/publish' as any)}
              >
                <Ionicons name="add-circle" size={16} color={colors.accentText} />
                <Text style={styles.ctaBtnText}>Publish a Ride</Text>
              </TouchableOpacity>
            </View>
          ) : (
            publishedRides.map((ride) => (
              <View key={ride.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.publishedTitle}>
                      {ride.origin.city} → {ride.destination.city}
                    </Text>
                    <Text style={styles.dateText}>
                      {ride.date} • {ride.departureTime}
                    </Text>
                  </View>
                  <View style={styles.activePill}>
                    <Text style={styles.activePillText}>ACTIVE</Text>
                  </View>
                </View>

                <View style={styles.publishedStatsRow}>
                  <View style={styles.statBox}>
                    <Text style={styles.statNumber}>{ride.totalSeats}</Text>
                    <Text style={styles.statLabel}>Total Seats</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statNumber}>{ride.availableSeats}</Text>
                    <Text style={styles.statLabel}>Seats Left</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statNumber}>₹{ride.pricePerSeat}</Text>
                    <Text style={styles.statLabel}>Per Seat</Text>
                  </View>
                </View>

                <View style={styles.publishedPassengerBar}>
                  <Ionicons name="people-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.publishedPassengerText}>
                    {ride.passengers.length === 0
                      ? 'No passengers booked yet'
                      : `${ride.passengers.length} passenger(s) booked`}
                  </Text>
                </View>
              </View>
            ))
          )
        ) : (
          /* ─── TAB 3: CITY TAXI / AUTO RIDES ─── */
          cityBookings.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="car-off" size={56} color={colors.textTertiary} />
              <Text style={styles.emptyTitle}>No city rides yet</Text>
              <Text style={styles.emptySub}>
                Book rapid on-demand Bike, Auto or Cab for daily intra-city commutes.
              </Text>
              <TouchableOpacity
                style={styles.ctaBtn}
                onPress={() => router.push('/(tabs)')}
              >
                <Ionicons name="compass" size={16} color={colors.accentText} />
                <Text style={styles.ctaBtnText}>Request a City Ride</Text>
              </TouchableOpacity>
            </View>
          ) : (
            cityBookings.map((b) => (
              <TouchableOpacity
                key={b.id}
                style={styles.card}
                activeOpacity={0.88}
                onPress={() =>
                  router.push({
                    pathname: '/ride-status' as any,
                    params: { bookingId: b.id },
                  })
                }
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cityCategoryTag}>{b.rideCategory.toUpperCase()}</Text>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>{b.status.toUpperCase()}</Text>
                  </View>
                </View>

                <Text style={styles.cityRoute}>
                  {b.pickup.name} → {b.destination.name}
                </Text>

                <View style={styles.cityFooter}>
                  <Text style={styles.cityFareText}>
                    ₹{b.estimatedFareMin} - ₹{b.estimatedFareMax}
                  </Text>
                  <View style={styles.trackLiveRow}>
                    <Text style={styles.trackLiveText}>Track Live Status</Text>
                    <Ionicons name="chevron-forward" size={14} color="#0284C7" />
                  </View>
                </View>
              </TouchableOpacity>
            ))
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
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  headerTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.heavy,
    color: colors.textPrimary,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: borderRadius.pill,
    padding: 3,
    marginTop: spacing.xs,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    borderRadius: borderRadius.pill,
  },
  tabItemActive: {
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  tabText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.medium,
    color: colors.textTertiary,
  },
  tabTextActive: {
    color: colors.textPrimary,
    fontWeight: typography.fontWeights.bold,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.huge,
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    marginTop: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  emptySub: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  ctaBtn: {
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xl,
    height: 48,
    borderRadius: borderRadius.pill,
    ...shadows.sm,
  },
  ctaBtnText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.accentText,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  bookingRefText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.heavy,
    color: '#0284C7',
  },
  dateText: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  statusConfirmed: {
    backgroundColor: '#ECFDF5',
  },
  statusCancelled: {
    backgroundColor: '#FEF2F2',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
  },
  statusConfirmedText: {
    color: '#059669',
  },
  statusCancelledText: {
    color: '#EF4444',
  },
  routeRow: {
    marginVertical: spacing.xs,
  },
  timeRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  timeText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  citiesText: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.heavy,
    color: colors.textPrimary,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceMuted,
  },
  driverSnippet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  miniAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniAvatarText: {
    color: '#FFFFFF',
    fontWeight: typography.fontWeights.bold,
    fontSize: typography.fontSizes.xs,
  },
  driverSnippetName: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  driverSnippetCar: {
    fontSize: 10,
    color: colors.textTertiary,
  },
  priceSnippet: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.heavy,
    color: colors.textPrimary,
  },
  seatsSnippet: {
    fontSize: 10,
    color: colors.textTertiary,
  },
  viewPassBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  viewPassText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
    color: '#0284C7',
  },
  publishedTitle: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.heavy,
    color: colors.textPrimary,
  },
  activePill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.pill,
  },
  activePillText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: '#059669',
  },
  publishedStatsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
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
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.heavy,
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textTertiary,
    marginTop: 1,
  },
  publishedPassengerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
  publishedPassengerText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  cityCategoryTag: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  cityRoute: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textPrimary,
    marginVertical: spacing.xs,
  },
  cityFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  cityFareText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  trackLiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  trackLiveText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
    color: '#0284C7',
  },
});

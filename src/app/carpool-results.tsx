/**
 * NEXORA RIDE — 10/10 BlaBlaCar Carpool Search Results
 *
 * Horizontal Date Strip, Time-of-Day Filters, Sort options,
 * and Safety Guarantees.
 */

import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '@/theme/tokens';
import { CarpoolService } from '@/services/carpoolService';
import type { CarpoolRide } from '@/models/carpool';
import { CarpoolRideCard } from '@/components/carpool/CarpoolRideCard';

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

  // Generate next 6 days for the horizontal date strip
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
  const [timeFilter, setTimeFilter] = useState<'all' | 'morning' | 'afternoon' | 'evening'>('all');
  const [activeFilter, setActiveFilter] = useState<'all' | 'instant' | 'max2' | 'ladies'>(
    params.filter || 'all'
  );
  const [sortBy, setSortBy] = useState<'earliest' | 'price' | 'rating'>('earliest');

  const [rides, setRides] = useState<CarpoolRide[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
        timeFilter
      );
      if (isMounted) {
        setRides(results);
        setIsLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [originQuery, destinationQuery, selectedDate, seatsCount, timeFilter]);

  const filteredAndSortedRides = useMemo(() => {
    let list = [...rides];

    // Filter
    if (activeFilter === 'instant') {
      list = list.filter((r) => r.isInstantBooking);
    } else if (activeFilter === 'max2') {
      list = list.filter((r) => r.amenities.maxTwoInBack);
    } else if (activeFilter === 'ladies') {
      list = list.filter((r) => r.amenities.ladiesOnly);
    }

    // Sort
    if (sortBy === 'price') {
      list.sort((a, b) => a.pricePerSeat - b.pricePerSeat);
    } else if (sortBy === 'rating') {
      list.sort((a, b) => b.driver.rating - a.driver.rating);
    } else {
      // Earliest departure
      list.sort((a, b) => a.departureTime.localeCompare(b.departureTime));
    }

    return list;
  }, [rides, activeFilter, sortBy]);

  const handleSelectRide = (ride: CarpoolRide) => {
    router.push({
      pathname: '/carpool-detail' as any,
      params: { rideId: ride.id, seats: seatsCount.toString() },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerRoute} numberOfLines={1}>
            {originQuery} → {destinationQuery}
          </Text>
          <Text style={styles.headerDate}>
            {seatsCount} {seatsCount === 1 ? 'passenger' : 'passengers'} • {filteredAndSortedRides.length} rides found
          </Text>
        </View>

        <TouchableOpacity
          style={styles.searchEditBtn}
          onPress={() => router.back()}
          accessibilityLabel="Edit search"
        >
          <Ionicons name="options-outline" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* ─── HORIZONTAL DATE STRIP ─── */}
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

      {/* ─── FILTERS & SORT ROW ─── */}
      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {/* Instant Book */}
          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'instant' && styles.filterChipActive]}
            onPress={() => setActiveFilter(activeFilter === 'instant' ? 'all' : 'instant')}
          >
            <Ionicons
              name="flash"
              size={12}
              color={activeFilter === 'instant' ? colors.accentText : '#059669'}
            />
            <Text style={[styles.filterText, activeFilter === 'instant' && styles.filterTextActive]}>
              Instant
            </Text>
          </TouchableOpacity>

          {/* Max 2 Back */}
          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'max2' && styles.filterChipActive]}
            onPress={() => setActiveFilter(activeFilter === 'max2' ? 'all' : 'max2')}
          >
            <Ionicons
              name="people"
              size={12}
              color={activeFilter === 'max2' ? colors.accentText : colors.textSecondary}
            />
            <Text style={[styles.filterText, activeFilter === 'max2' && styles.filterTextActive]}>
              Max 2 back
            </Text>
          </TouchableOpacity>

          {/* Ladies Only */}
          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'ladies' && styles.filterChipActive]}
            onPress={() => setActiveFilter(activeFilter === 'ladies' ? 'all' : 'ladies')}
          >
            <Text style={[styles.filterText, activeFilter === 'ladies' && styles.filterTextActive]}>
              🌸 Ladies
            </Text>
          </TouchableOpacity>

          {/* Morning / Afternoon Filter */}
          <TouchableOpacity
            style={[styles.filterChip, timeFilter === 'morning' && styles.filterChipActive]}
            onPress={() => setTimeFilter(timeFilter === 'morning' ? 'all' : 'morning')}
          >
            <Ionicons
              name="sunny-outline"
              size={12}
              color={timeFilter === 'morning' ? colors.accentText : '#D97706'}
            />
            <Text style={[styles.filterText, timeFilter === 'morning' && styles.filterTextActive]}>
              Morning (6-12)
            </Text>
          </TouchableOpacity>

          {/* Sort By Lowest Price */}
          <TouchableOpacity
            style={[styles.filterChip, sortBy === 'price' && styles.filterChipActive]}
            onPress={() => setSortBy(sortBy === 'price' ? 'earliest' : 'price')}
          >
            <Ionicons
              name="cash-outline"
              size={12}
              color={sortBy === 'price' ? colors.accentText : colors.textSecondary}
            />
            <Text style={[styles.filterText, sortBy === 'price' && styles.filterTextActive]}>
              Lowest Price
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Safety Guarantee Pill */}
      <View style={styles.safetyGuaranteePill}>
        <Ionicons name="shield-checkmark" size={14} color="#059669" />
        <Text style={styles.safetyGuaranteeText}>
          Every driver verified with Govt ID, background check & zero surge guarantee
        </Text>
      </View>

      {/* Main List */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Searching available carpools...</Text>
        </View>
      ) : filteredAndSortedRides.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="car-outline" size={54} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>No matching carpools found</Text>
          <Text style={styles.emptySub}>
            Try selecting another date or publish your own ride on this route!
          </Text>
          <TouchableOpacity
            style={styles.publishPromptBtn}
            onPress={() => router.push('/(tabs)/publish' as any)}
          >
            <Ionicons name="add-circle" size={18} color={colors.accentText} />
            <Text style={styles.publishPromptText}>Publish a Ride</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredAndSortedRides}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <CarpoolRideCard ride={item} onPress={() => handleSelectRide(item)} />
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
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    marginHorizontal: spacing.md,
  },
  headerRoute: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.heavy,
    color: colors.textPrimary,
  },
  headerDate: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  searchEditBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateStripContainer: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.xs,
  },
  dateStripContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  dateChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  dateChipActive: {
    backgroundColor: colors.primary,
  },
  dateChipDay: {
    fontSize: 10,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textTertiary,
  },
  dateChipDayActive: {
    color: colors.accent,
  },
  dateChipNum: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.heavy,
    color: colors.textPrimary,
    marginTop: 1,
  },
  dateChipNumActive: {
    color: '#FFFFFF',
  },
  filterRow: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.xs,
  },
  filterScroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  filterChipActive: {
    backgroundColor: colors.accent,
  },
  filterText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.accentText,
    fontWeight: typography.fontWeights.bold,
  },
  safetyGuaranteePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.pill,
  },
  safetyGuaranteeText: {
    fontSize: 10,
    color: '#065F46',
    fontWeight: typography.fontWeights.medium,
    flex: 1,
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing.huge,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
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
  },
  publishPromptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.pill,
    ...shadows.sm,
  },
  publishPromptText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.accentText,
  },
});

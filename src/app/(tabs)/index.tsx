/**
 * NEXORA RIDE — Home Screen
 *
 * Pure intercity carpooling hub. NO commercial ride modes (Bike/Auto/Cab).
 * - Search for published carpool rides between Indian cities
 * - Interactive India map showing route preview
 * - Publish your own ride banner
 * - Safety trust bar
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '@/theme/tokens';
import { BrandLogo } from '@/components/common/BrandLogo';
import { SmartMap } from '@/components/map/SmartMap';
import { SafetyModal } from '@/components/safety/SafetyModal';
import { triggerHaptic } from '@/utils/haptics';
import { CarpoolService } from '@/services/carpoolService';
import { RealGeocodingProvider } from '@/services/geocoding';
import type { CarpoolRide } from '@/models/carpool';

const geocoder = new RealGeocodingProvider();

export default function HomeScreen() {
  const router = useRouter();

  // Carpool search state — all empty by default
  const [originCity, setOriginCity] = useState('');
  const [destinationCity, setDestinationCity] = useState('');
  const [passengers, setPassengers] = useState(1);
  const [dateSelection, setDateSelection] = useState<'today' | 'tomorrow'>('today');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'ladies' | 'instant' | 'max2'>('all');
  const [isSafetyVisible, setIsSafetyVisible] = useState(false);
  const [activeRides, setActiveRides] = useState<CarpoolRide[]>([]);

  // Map coordinates for route preview
  const [mapPickup, setMapPickup] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapDest, setMapDest] = useState<{ latitude: number; longitude: number } | null>(null);

  // Fetch real published rides from Supabase
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const rides = await CarpoolService.getAllRides();
        if (isMounted) {
          setActiveRides(rides);
        }
      } catch {
        // Supabase unavailable — show empty
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // Geocode origin city for map preview
  useEffect(() => {
    if (originCity.trim().length < 3) {
      setMapPickup(null);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const results = await geocoder.searchPlaces(originCity.trim());
        if (results.length > 0 && results[0].coordinates) {
          setMapPickup(results[0].coordinates);
        }
      } catch {
        // Silently fail
      }
    }, 600);
    return () => clearTimeout(timeout);
  }, [originCity]);

  // Geocode destination city for map preview
  useEffect(() => {
    if (destinationCity.trim().length < 3) {
      setMapDest(null);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const results = await geocoder.searchPlaces(destinationCity.trim());
        if (results.length > 0 && results[0].coordinates) {
          setMapDest(results[0].coordinates);
        }
      } catch {
        // Silently fail
      }
    }, 600);
    return () => clearTimeout(timeout);
  }, [destinationCity]);

  const handleSearchCarpools = () => {
    if (!originCity.trim() || !destinationCity.trim()) {
      Alert.alert(
        'Enter Route',
        'Please enter both departure and destination cities to search for available rides.'
      );
      return;
    }
    triggerHaptic.impactMedium();
    router.push({
      pathname: '/carpool-results' as any,
      params: {
        origin: originCity.trim(),
        destination: destinationCity.trim(),
        seats: passengers.toString(),
        filter: selectedFilter !== 'all' ? selectedFilter : undefined,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <BrandLogo size="sm" variant="dark" showTagline={false} />
          <TouchableOpacity
            style={styles.safetyHeaderBtn}
            onPress={() => setIsSafetyVisible(true)}
            accessibilityLabel="Open Safety Hub"
          >
            <Ionicons name="shield-checkmark" size={14} color="#059669" />
            <Text style={styles.safetyHeaderBtnText}>24x7 Safety</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Page Title */}
        <Text style={styles.pageTitle}>Find a carpool ride</Text>

        {/* Interactive India Map */}
        <View style={styles.mapCard}>
          <SmartMap
            pickup={mapPickup}
            destination={mapDest}
            pickupLabel={originCity || 'Origin'}
            destinationLabel={destinationCity || 'Destination'}
            height={200}
          />
        </View>

        {/* Search Card */}
        <View style={styles.searchCard}>
          {/* From */}
          <View style={styles.searchRow}>
            <View style={styles.originDot} />
            <TextInput
              style={styles.searchInput}
              value={originCity}
              onChangeText={setOriginCity}
              placeholder="Leaving from"
              placeholderTextColor={colors.textTertiary}
            />
            {originCity.length > 0 && (
              <TouchableOpacity onPress={() => setOriginCity('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.searchDivider} />

          {/* To */}
          <View style={styles.searchRow}>
            <View style={styles.destDot} />
            <TextInput
              style={styles.searchInput}
              value={destinationCity}
              onChangeText={setDestinationCity}
              placeholder="Going to"
              placeholderTextColor={colors.textTertiary}
            />
            {destinationCity.length > 0 && (
              <TouchableOpacity onPress={() => setDestinationCity('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.searchDivider} />

          {/* Date + Passengers */}
          <View style={styles.metaRow}>
            <View style={styles.metaCol}>
              <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
              <View style={styles.dateToggleRow}>
                <TouchableOpacity
                  style={[styles.dateChip, dateSelection === 'today' && styles.dateChipActive]}
                  onPress={() => setDateSelection('today')}
                >
                  <Text style={[styles.dateChipText, dateSelection === 'today' && styles.dateChipTextActive]}>
                    Today
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.dateChip, dateSelection === 'tomorrow' && styles.dateChipActive]}
                  onPress={() => setDateSelection('tomorrow')}
                >
                  <Text style={[styles.dateChipText, dateSelection === 'tomorrow' && styles.dateChipTextActive]}>
                    Tomorrow
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.metaDivider} />

            <View style={styles.metaCol}>
              <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.metaValue}>
                {passengers}
              </Text>
              <View style={styles.counterBtns}>
                <TouchableOpacity
                  onPress={() => setPassengers((p) => Math.max(1, p - 1))}
                  style={styles.counterBtn}
                >
                  <Ionicons name="remove" size={14} color={colors.textPrimary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setPassengers((p) => Math.min(4, p + 1))}
                  style={styles.counterBtn}
                >
                  <Ionicons name="add" size={14} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Quick Ride Preferences */}
          <View style={styles.preferenceRow}>
            <TouchableOpacity
              style={[styles.prefChip, selectedFilter === 'ladies' && styles.prefChipLadiesActive]}
              onPress={() => setSelectedFilter((prev) => (prev === 'ladies' ? 'all' : 'ladies'))}
              activeOpacity={0.8}
            >
              <Ionicons
                name="heart"
                size={12}
                color={selectedFilter === 'ladies' ? '#BE185D' : colors.textSecondary}
              />
              <Text style={[styles.prefChipText, selectedFilter === 'ladies' && styles.prefChipLadiesTextActive]}>
                Ladies Only
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.prefChip, selectedFilter === 'instant' && styles.prefChipInstantActive]}
              onPress={() => setSelectedFilter((prev) => (prev === 'instant' ? 'all' : 'instant'))}
              activeOpacity={0.8}
            >
              <Ionicons
                name="flash"
                size={12}
                color={selectedFilter === 'instant' ? '#059669' : colors.textSecondary}
              />
              <Text style={[styles.prefChipText, selectedFilter === 'instant' && styles.prefChipInstantTextActive]}>
                Instant
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.prefChip, selectedFilter === 'max2' && styles.prefChipMax2Active]}
              onPress={() => setSelectedFilter((prev) => (prev === 'max2' ? 'all' : 'max2'))}
              activeOpacity={0.8}
            >
              <Ionicons
                name="people"
                size={12}
                color={selectedFilter === 'max2' ? '#0284C7' : colors.textSecondary}
              />
              <Text style={[styles.prefChipText, selectedFilter === 'max2' && styles.prefChipMax2TextActive]}>
                Max 2 Back
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search Button */}
          <TouchableOpacity
            style={styles.searchBtn}
            onPress={handleSearchCarpools}
            activeOpacity={0.88}
          >
            <Ionicons name="search" size={18} color={colors.accentText} />
            <Text style={styles.searchBtnText}>Search Rides</Text>
          </TouchableOpacity>
        </View>

        {/* Safety & Cost-Sharing Trust Bar */}
        <TouchableOpacity
          style={styles.trustStrip}
          onPress={() => setIsSafetyVisible(true)}
          activeOpacity={0.8}
        >
          <View style={styles.trustItem}>
            <Ionicons name="shield-checkmark" size={13} color="#059669" />
            <Text style={styles.trustItemText}>ID Verified</Text>
          </View>
          <View style={styles.trustDot} />
          <View style={styles.trustItem}>
            <Ionicons name="cash-outline" size={13} color="#0284C7" />
            <Text style={styles.trustItemText}>Regulated Cost Sharing</Text>
          </View>
          <View style={styles.trustDot} />
          <View style={styles.trustItem}>
            <Ionicons name="chatbubbles-outline" size={13} color="#D97706" />
            <Text style={styles.trustItemText}>Passenger Rating</Text>
          </View>
        </TouchableOpacity>

        {/* Real Published Rides (Only if someone actually published) */}
        {activeRides.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Recently Published Rides</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.popularScroll}>
              {activeRides.map((ride) => (
                <TouchableOpacity
                  key={ride.id}
                  style={styles.routeChip}
                  onPress={() => {
                    setOriginCity(ride.origin.city);
                    setDestinationCity(ride.destination.city);
                    router.push({
                      pathname: '/carpool-detail' as any,
                      params: { rideId: ride.id, seats: '1' },
                    });
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.routeChipRoute}>
                    {ride.origin.city} → {ride.destination.city}
                  </Text>
                  <View style={styles.routeChipBottom}>
                    <Text style={styles.routeChipPrice}>₹{ride.pricePerSeat}</Text>
                    <Text style={styles.routeChipTime}>{ride.availableSeats} seat(s) left</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* Publish a Ride — compact banner */}
        <TouchableOpacity
          style={styles.publishBanner}
          onPress={() => router.push('/(tabs)/publish' as any)}
          activeOpacity={0.9}
        >
          <View style={styles.publishIcon}>
            <Ionicons name="car-sport" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.publishTitle}>Driving somewhere?</Text>
            <Text style={styles.publishSub}>
              Share your ride, split fuel costs.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
        </TouchableOpacity>
      </ScrollView>

      {/* Safety Hub Modal */}
      <SafetyModal
        visible={isSafetyVisible}
        onClose={() => setIsSafetyVisible(false)}
      />
    </SafeAreaView>
  );
}

/* ─── STYLES ─── */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  /* Header */
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
  },
  safetyHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.pill,
  },
  safetyHeaderBtnText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
    color: '#059669',
  },

  /* Scroll */
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.huge,
  },

  /* Page Title */
  pageTitle: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.heavy,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },

  /* Map */
  mapCard: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },

  /* Search Card */
  searchCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  originDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#0284C7',
    backgroundColor: colors.surface,
  },
  destDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textPrimary,
    paddingVertical: 2,
  },
  searchDivider: {
    height: 1,
    backgroundColor: colors.surfaceMuted,
    marginLeft: 26,
  },
  metaRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.surfaceMuted,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
  },
  metaCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaDivider: {
    width: 1,
    backgroundColor: colors.surfaceMuted,
    marginHorizontal: spacing.sm,
  },
  dateToggleRow: {
    flexDirection: 'row',
    gap: 4,
  },
  dateChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  dateChipActive: {
    backgroundColor: colors.primary,
  },
  dateChipText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
  },
  dateChipTextActive: {
    color: '#FFFFFF',
    fontWeight: typography.fontWeights.bold,
  },
  metaValue: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  counterBtns: {
    flexDirection: 'row',
    gap: 4,
    marginLeft: 'auto',
  },
  counterBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preferenceRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  prefChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  prefChipText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
  },
  prefChipLadiesActive: {
    backgroundColor: '#FCE7F3',
    borderColor: '#F472B6',
  },
  prefChipLadiesTextActive: {
    color: '#BE185D',
    fontWeight: typography.fontWeights.bold,
  },
  prefChipInstantActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#6EE7B7',
  },
  prefChipInstantTextActive: {
    color: '#059669',
    fontWeight: typography.fontWeights.bold,
  },
  prefChipMax2Active: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  prefChipMax2TextActive: {
    color: '#0284C7',
    fontWeight: typography.fontWeights.bold,
  },
  searchBtn: {
    backgroundColor: colors.accent,
    height: 48,
    borderRadius: borderRadius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  searchBtnText: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    color: colors.accentText,
  },
  trustStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trustItemText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
  },
  trustDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.borderStrong,
  },

  /* Recently Published Rides */
  sectionTitle: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  popularScroll: {
    marginBottom: spacing.lg,
  },
  routeChip: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 160,
  },
  routeChipRoute: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  routeChipBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  routeChipPrice: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.heavy,
    color: colors.primary,
  },
  routeChipTime: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
  },

  /* Publish Banner */
  publishBanner: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.md,
  },
  publishIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  publishSub: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
});

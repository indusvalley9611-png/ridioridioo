/**
 * NEXORA RIDE — Home Screen
 *
 * Clean, simple dual-mode hub:
 * 1. Carpool — Intercity ride-sharing search
 * 2. City Ride — On-demand Bike/Auto/Cab booking
 *
 * Every feature is preserved; the layout is decluttered for comfort.
 */

import React, { useEffect, useCallback, useState } from 'react';
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
import type { RideCategory, LocationShortcut } from '@/models/types';
import { BrandLogo } from '@/components/common/BrandLogo';
import { SmartMap } from '@/components/map/SmartMap';
import { RideCategoryCard } from '@/components/home/RideCategoryCard';
import { LocationShortcutCard } from '@/components/home/LocationShortcutCard';
import { Button } from '@/components/common/Button';
import { useTrip } from '@/context/TripContext';
import { RealGeocodingProvider } from '@/services/geocoding';
import { SafetyModal } from '@/components/safety/SafetyModal';
import { triggerHaptic } from '@/utils/haptics';
import * as Location from 'expo-location';
import { CarpoolService } from '@/services/carpoolService';
import type { CarpoolRide } from '@/models/carpool';

const geocoder = new RealGeocodingProvider();

const RIDE_CATEGORIES: RideCategory[] = [
  {
    id: 'bike',
    name: 'Nexora Bike',
    tagline: 'Fastest through peak Indian traffic',
    etaMinutes: 3,
    capacity: '1 Rider',
    iconName: 'motorbike',
    estimatedPrice: '₹25 base + ₹12/km',
    badge: 'FASTEST',
    popular: true,
  },
  {
    id: 'auto',
    name: 'Nexora Auto',
    tagline: 'Affordable doorstep three-wheeler',
    etaMinutes: 4,
    capacity: '3 Riders',
    iconName: 'rickshaw',
    estimatedPrice: '₹30 base + ₹15/km',
    badge: 'POPULAR',
  },
  {
    id: 'cab',
    name: 'Nexora Prime Cab',
    tagline: 'Air-conditioned comfort & ample boot space',
    etaMinutes: 7,
    capacity: '4 Riders',
    iconName: 'car-side',
    estimatedPrice: '₹50 base + ₹18/km',
  },
];

const SHORTCUTS: LocationShortcut[] = [
  {
    id: 'home',
    title: 'Home',
    subtitle: 'Add home location',
    icon: 'home',
  },
  {
    id: 'work',
    title: 'Work',
    subtitle: 'Add work location',
    icon: 'briefcase',
  },
];

export default function HomeScreen() {
  const router = useRouter();

  const [appMode, setAppMode] = useState<'carpool' | 'city'>('carpool');

  // Carpool search state - empty by default for user input
  const [originCity, setOriginCity] = useState('');
  const [destinationCity, setDestinationCity] = useState('');
  const [passengers, setPassengers] = useState(1);
  const [dateSelection, setDateSelection] = useState<'today' | 'tomorrow'>('today');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'ladies' | 'instant' | 'max2'>('all');
  const [isSafetyVisible, setIsSafetyVisible] = useState(false);
  const [activeRides, setActiveRides] = useState<CarpoolRide[]>([]);

  // Fetch real published rides from Supabase / local storage
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const rides = await CarpoolService.getAllRides();
        if (isMounted) {
          setActiveRides(rides);
        }
      } catch {
        // Fallback
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [appMode]);

  const {
    trip,
    allFareEstimates,
    setPickup,
    setDestination,
    swapLocations,
    selectCategory,
    computeFares,
    isComputingFares,
  } = useTrip();

  const { pickup, destination, selectedCategory, routeInfo } = trip;

  // Auto-detect GPS location on launch
  useEffect(() => {
    let isMounted = true;
    async function detectCurrentLocation() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (!isMounted) return;

        const resolved = await geocoder.reverseGeocode({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });

        if (resolved && isMounted) {
          setPickup(resolved);
        }
      } catch {
        // Fallback silently
      }
    }

    if (!pickup) {
      detectCurrentLocation();
    }

    return () => {
      isMounted = false;
    };
  }, [pickup, setPickup]);

  // Compute fares when both locations are set in city mode
  useEffect(() => {
    if (appMode === 'city' && pickup && destination && !routeInfo && !isComputingFares) {
      computeFares();
    }
  }, [appMode, pickup, destination, routeInfo, isComputingFares, computeFares]);

  const handlePickupPress = () => {
    router.push('/location-search?mode=pickup');
  };

  const handleDestinationPress = () => {
    router.push('/location-search?mode=destination');
  };

  const handleShortcutPress = useCallback(
    async (shortcut: LocationShortcut) => {
      if (shortcut.coordinates) {
        const resolved = await geocoder.reverseGeocode(shortcut.coordinates);
        if (resolved) {
          setDestination(resolved);
        }
      }
    },
    [setDestination]
  );

  const handleCategorySelect = useCallback(
    (category: RideCategory) => {
      selectCategory(category);
    },
    [selectCategory]
  );

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

      {/* ── Clean Header ── */}
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

        {/* Mode Toggle */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeTab, appMode === 'carpool' && styles.modeTabActive]}
            onPress={() => setAppMode('carpool')}
          >
            <Ionicons
              name="car"
              size={15}
              color={appMode === 'carpool' ? colors.primary : colors.textTertiary}
            />
            <Text
              style={[styles.modeTabText, appMode === 'carpool' && styles.modeTabTextActive]}
            >
              Carpool
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeTab, appMode === 'city' && styles.modeTabActive]}
            onPress={() => setAppMode('city')}
          >
            <Ionicons
              name="bicycle"
              size={15}
              color={appMode === 'city' ? colors.primary : colors.textTertiary}
            />
            <Text
              style={[styles.modeTabText, appMode === 'city' && styles.modeTabTextActive]}
            >
              City Ride
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {appMode === 'carpool' ? (
          /* ─── CARPOOL MODE ─── */
          <>
            {/* Simple Heading */}
            <Text style={styles.pageTitle}>Find a carpool ride</Text>

            {/* Search Card — clean 2-field + date/passengers */}
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

              {/* Date + Passengers — compact single row */}
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
                <Text style={styles.trustItemText}>BlaBla Rating</Text>
              </View>
            </TouchableOpacity>

            {/* Real Published Rides (Only displays if someone actually published a ride) */}
            {activeRides.length > 0 ? (
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
            ) : null}

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
          </>
        ) : (
          /* ─── CITY RIDE MODE ─── */
          <>
            {/* Map */}
            <View style={styles.mapCard}>
              <SmartMap
                pickup={pickup?.coordinates}
                destination={destination?.coordinates}
                routeInfo={routeInfo}
                height={200}
              />
            </View>

            {/* Pickup & Drop */}
            <View style={styles.locationCard}>
              <TouchableOpacity
                style={styles.locationRow}
                onPress={handlePickupPress}
                activeOpacity={0.7}
              >
                <View style={styles.pickupDot} />
                <View style={styles.locationTextCol}>
                  <Text style={styles.locationLabel}>Pickup</Text>
                  <Text style={styles.locationValue} numberOfLines={1}>
                    {pickup ? pickup.name : 'Select pickup point'}
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={styles.locationDivider}>
                <TouchableOpacity style={styles.swapBtn} onPress={swapLocations}>
                  <Ionicons name="swap-vertical" size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.locationRow}
                onPress={handleDestinationPress}
                activeOpacity={0.7}
              >
                <View style={styles.destSquare} />
                <View style={styles.locationTextCol}>
                  <Text style={styles.locationLabel}>Drop</Text>
                  <Text style={styles.locationValue} numberOfLines={1}>
                    {destination ? destination.name : 'Where are you heading?'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Shortcuts */}
            <View style={styles.shortcutsRow}>
              {SHORTCUTS.map((s) => (
                <LocationShortcutCard
                  key={s.id}
                  shortcut={s}
                  onPress={() => handleShortcutPress(s)}
                />
              ))}
            </View>

            {/* Ride Categories */}
            <Text style={styles.sectionTitle}>Choose your ride</Text>
            {RIDE_CATEGORIES.map((cat) => (
              <RideCategoryCard
                key={cat.id}
                category={cat}
                fareEstimate={allFareEstimates.find((f) => f.categoryId === cat.id)}
                isSelected={selectedCategory?.id === cat.id}
                onSelect={() => handleCategorySelect(cat)}
              />
            ))}

            {/* Confirm Button */}
            {pickup && destination && (
              <Button
                title={
                  isComputingFares
                    ? 'Computing Fare...'
                    : `Confirm ${selectedCategory?.name || 'Ride'}`
                }
                variant="primary"
                onPress={() => router.push('/ride-review')}
                disabled={isComputingFares}
                style={styles.confirmBtn}
              />
            )}
          </>
        )}
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
    marginBottom: spacing.sm,
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
  safetyBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Mode Toggle */
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: borderRadius.pill,
    padding: 3,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: borderRadius.pill,
  },
  modeTabActive: {
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  modeTabText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    color: colors.textTertiary,
  },
  modeTabTextActive: {
    color: colors.textPrimary,
    fontWeight: typography.fontWeights.bold,
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
    marginBottom: spacing.lg,
    marginTop: spacing.xs,
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

  /* Popular Routes */
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

  /* City Ride Mode */
  mapCard: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  locationCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickupDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    marginRight: spacing.md,
  },
  destSquare: {
    width: 10,
    height: 10,
    borderRadius: 2,
    backgroundColor: '#0284C7',
    marginRight: spacing.md,
  },
  locationTextCol: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  locationValue: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textPrimary,
    marginTop: 1,
  },
  locationDivider: {
    height: 20,
    justifyContent: 'center',
    marginLeft: 4,
  },
  swapBtn: {
    position: 'absolute',
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  confirmBtn: {
    marginTop: spacing.md,
  },
});

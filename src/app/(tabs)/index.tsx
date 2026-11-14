/**
 * NEXORA RIDE — Home Screen (Rapido Modern Mobile Interface)
 *
 * Designed to match Rapido's clean, modern layout (Picture 2):
 * - Top Rapido header with "For me ▾" and 24x7 Safety badge
 * - "Uh oh, we can't find you!" contextual alert banner
 * - Dual Route Card: [🟢 Pickup location] and [🟠 Drop location] with connecting line
 * - 📍 "Map" pill button to toggle interactive Indian map preview
 * - Previously searched recent locations list with 🕒 clock icon and 🤍 favorite heart
 * - Instant partial-word autocomplete suggestions as user types ("raja", "pres", "bom", "silk")
 * - Date, passenger count & Search Rides action
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Keyboard,
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
import { getRecentSearches, addRecentSearch } from '@/services/recentSearches';
import { useTrip } from '@/context/TripContext';
import type { PlaceSuggestion, RecentSearch, ResolvedLocation } from '@/models/types';
import type { CarpoolRide } from '@/models/carpool';

const geocoder = new RealGeocodingProvider();
const DEBOUNCE_MS = 150; // Ultra-fast autocomplete

type FocusedField = 'pickup' | 'destination' | null;

export default function HomeScreen() {
  const router = useRouter();
  const { trip, setPickup, setDestination } = useTrip();

  // Active focused input
  const [activeField, setActiveField] = useState<FocusedField>('destination');

  // Input text values
  const [pickupText, setPickupText] = useState(trip.pickup?.name || '');
  const [dropText, setDropText] = useState(trip.destination?.name || '');

  // Live search query and results
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceSuggestion[]>([]);
  const [recentList, setRecentList] = useState<RecentSearch[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Show/hide Map preview
  const [showMap, setShowMap] = useState(false);

  // Filters & Schedule
  const [passengers, setPassengers] = useState(1);
  const [dateSelection, setDateSelection] = useState<'today' | 'tomorrow'>('today');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'ladies' | 'instant' | 'max2'>('all');
  const [isSafetyVisible, setIsSafetyVisible] = useState(false);
  const [activeRides, setActiveRides] = useState<CarpoolRide[]>([]);

  // Input refs
  const pickupInputRef = useRef<any>(null);
  const dropInputRef = useRef<any>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchSeqRef = useRef(0);

  // Sync TripContext changes
  useEffect(() => {
    if (trip.pickup) {
      setPickupText(trip.pickup.name);
    }
    if (trip.destination) {
      setDropText(trip.destination.name);
    }
  }, [trip.pickup, trip.destination]);

  // Load recents on launch
  useEffect(() => {
    getRecentSearches().then(setRecentList);
  }, []);

  // Fetch real published rides
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const rides = await CarpoolService.getAllRides();
        if (isMounted) setActiveRides(rides);
      } catch {
        // Fallback
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // Debounced search when query changes
  const handleQuerySearch = useCallback((text: string) => {
    setQuery(text);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!text.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const seq = ++searchSeqRef.current;

    debounceTimer.current = setTimeout(async () => {
      try {
        const suggestions = await geocoder.searchPlaces(text);
        if (seq === searchSeqRef.current) {
          setSearchResults(suggestions);
        }
      } catch {
        // Fallback
      } finally {
        if (seq === searchSeqRef.current) {
          setIsSearching(false);
        }
      }
    }, DEBOUNCE_MS);
  }, []);

  // Typing handlers
  const handlePickupChange = (text: string) => {
    setPickupText(text);
    setActiveField('pickup');
    handleQuerySearch(text);
  };

  const handleDropChange = (text: string) => {
    setDropText(text);
    setActiveField('destination');
    handleQuerySearch(text);
  };

  // Toggle favorite heart
  const toggleFavorite = (id: string) => {
    triggerHaptic.selection();
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Location item selection
  const handleSelectLocation = async (item: PlaceSuggestion | ResolvedLocation) => {
    triggerHaptic.selection();
    Keyboard.dismiss();

    let resolved: ResolvedLocation | null = null;

    if ('placeId' in item && item.coordinates) {
      resolved = {
        placeId: item.placeId,
        name: item.name,
        address: item.address,
        coordinates: item.coordinates,
        isDemo: false,
      };
    } else {
      resolved = await geocoder.getPlaceDetails((item as any).placeId || '');
      if (!resolved && 'coordinates' in item && item.coordinates) {
        resolved = item as ResolvedLocation;
      }
    }

    if (!resolved) return;

    await addRecentSearch(resolved);
    const updated = await getRecentSearches();
    setRecentList(updated);

    if (activeField === 'pickup') {
      setPickup(resolved);
      setPickupText(resolved.name);
      setQuery('');
      setSearchResults([]);

      // Auto-switch focus to Drop location if empty
      if (!dropText.trim()) {
        setActiveField('destination');
        setTimeout(() => {
          dropInputRef.current?.focus?.();
        }, 150);
      } else {
        setShowMap(true);
      }
    } else {
      setDestination(resolved);
      setDropText(resolved.name);
      setQuery('');
      setSearchResults([]);
      setShowMap(true);
    }
  };

  const handleSearchCarpools = () => {
    if (!pickupText.trim() || !dropText.trim()) {
      Alert.alert(
        'Enter Route',
        'Please enter both departure and destination locations to search for rides.'
      );
      return;
    }
    triggerHaptic.impactMedium();
    router.push({
      pathname: '/carpool-results' as any,
      params: {
        origin: pickupText.trim(),
        destination: dropText.trim(),
        seats: passengers.toString(),
        filter: selectedFilter !== 'all' ? selectedFilter : undefined,
      },
    });
  };

  const isRouteReady = pickupText.trim().length > 0 && dropText.trim().length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />

      {/* ─── Top Rapido-Style Header ─── */}
      <View style={styles.topHeader}>
        <BrandLogo size="sm" variant="dark" showTagline={false} />

        <View style={styles.topHeaderRight}>
          <TouchableOpacity style={styles.forMeDropdown} activeOpacity={0.8}>
            <Text style={styles.forMeText}>For me</Text>
            <Ionicons name="chevron-down" size={14} color="#0F172A" />
          </TouchableOpacity>

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
        keyboardShouldPersistTaps="always"
      >
        {/* ─── Contextual Alert Banner (Rapido Style) ─── */}
        {!pickupText.trim() && (
          <View style={styles.alertBanner}>
            <View style={styles.alertIconCircle}>
              <Ionicons name="information-circle" size={18} color="#475569" />
            </View>
            <Text style={styles.alertBannerText}>
              Uh oh, we can't find you! Enter your pickup location for a smooth ride.
            </Text>
          </View>
        )}

        {/* ─── Dual Route Card (Rapido Exact Design) ─── */}
        <View style={styles.routeCard}>
          {/* Left Side: Route Line Indicator */}
          <View style={styles.routeIndicatorCol}>
            <View style={styles.pickupGreenRing}>
              <View style={styles.pickupGreenDot} />
            </View>
            <View style={styles.dottedConnectorLine} />
            <View style={styles.dropOrangeCircle}>
              <Ionicons name="arrow-down" size={9} color="#FFFFFF" />
            </View>
          </View>

          {/* Right Side: Inputs */}
          <View style={styles.inputsCol}>
            {/* Pickup Input */}
            <View style={[styles.inputRow, activeField === 'pickup' && styles.inputRowFocused]}>
              <TextInput
                ref={pickupInputRef}
                style={styles.textInputField}
                placeholder="Pickup location"
                placeholderTextColor="#94A3B8"
                value={pickupText}
                onChangeText={handlePickupChange}
                onFocus={() => {
                  setActiveField('pickup');
                  setQuery(pickupText);
                }}
                returnKeyType="next"
                autoCorrect={false}
              />
              {pickupText.length > 0 ? (
                <TouchableOpacity
                  onPress={() => {
                    setPickupText('');
                    setPickup(null);
                    setQuery('');
                    setSearchResults([]);
                  }}
                  hitSlop={8}
                >
                  <Ionicons name="close-circle" size={18} color="#94A3B8" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => dropInputRef.current?.focus?.()}
                  hitSlop={8}
                  style={styles.plusBtn}
                >
                  <Ionicons name="add" size={20} color="#64748B" />
                </TouchableOpacity>
              )}
            </View>

            {/* Drop Location Input */}
            <View style={[styles.inputRow, activeField === 'destination' && styles.inputRowFocused]}>
              <TextInput
                ref={dropInputRef}
                style={styles.textInputField}
                placeholder="Drop location"
                placeholderTextColor="#94A3B8"
                value={dropText}
                onChangeText={handleDropChange}
                onFocus={() => {
                  setActiveField('destination');
                  setQuery(dropText);
                }}
                returnKeyType="search"
                autoCorrect={false}
              />
              {dropText.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setDropText('');
                    setDestination(null);
                    setQuery('');
                    setSearchResults([]);
                  }}
                  hitSlop={8}
                >
                  <Ionicons name="close-circle" size={18} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* ─── Map Pill Button (Toggles Map Preview) ─── */}
        <View style={styles.mapPillContainer}>
          <TouchableOpacity
            style={[styles.mapPillBtn, showMap && styles.mapPillBtnActive]}
            onPress={() => {
              triggerHaptic.selection();
              setShowMap((prev) => !prev);
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name="location-sharp"
              size={14}
              color={showMap ? '#FFFFFF' : '#0F172A'}
            />
            <Text style={[styles.mapPillText, showMap && styles.mapPillTextActive]}>
              {showMap ? 'Hide Map' : 'Map'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ─── Interactive Map (When Map pill is active or route selected) ─── */}
        {showMap && (
          <View style={styles.mapWrapper}>
            <SmartMap
              pickup={trip.pickup?.coordinates}
              destination={trip.destination?.coordinates}
              pickupLabel={pickupText || 'Pickup'}
              destinationLabel={dropText || 'Drop'}
              height={210}
            />
          </View>
        )}

        {/* ─── Search Loading Indicator ─── */}
        {isSearching && (
          <View style={styles.searchingRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.searchingText}>Searching locations across India...</Text>
          </View>
        )}

        {/* ─── Rapido-Style Locations List (Autocompletes & Recents) ─── */}
        <View style={styles.locationsListContainer}>
          {(query.trim().length > 0 ? searchResults : recentList).map((item, idx) => {
            const loc = 'location' in item ? item.location : item;
            const itemId = loc.placeId || loc.name;
            const isFav = favorites.has(itemId);
            const isRecent = 'location' in item || query.trim().length === 0;

            return (
              <TouchableOpacity
                key={itemId || `loc-${idx}`}
                style={styles.locationListItem}
                onPress={() => handleSelectLocation(loc)}
                activeOpacity={0.7}
              >
                {/* Left Icon: Clock for recents, Pin for live results */}
                <View style={styles.itemIconCol}>
                  {isRecent ? (
                    <Ionicons name="time-outline" size={20} color="#475569" />
                  ) : (
                    <Ionicons name="location-outline" size={20} color={colors.primary} />
                  )}
                </View>

                {/* Title & Subtitle */}
                <View style={styles.itemTextCol}>
                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {loc.name}
                  </Text>
                  <Text style={styles.itemSubtitle} numberOfLines={1}>
                    {loc.address}
                  </Text>
                </View>

                {/* Right Favorite Heart Icon */}
                <TouchableOpacity
                  style={styles.heartBtn}
                  onPress={() => toggleFavorite(itemId)}
                  hitSlop={8}
                >
                  <Ionicons
                    name={isFav ? 'heart' : 'heart-outline'}
                    size={20}
                    color={isFav ? '#E11D48' : '#94A3B8'}
                  />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ─── Route Options & Search Button (When Route is Chosen) ─── */}
        <View style={styles.bookingControlsCard}>
          {/* Date & Passenger row */}
          <View style={styles.metaRow}>
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

            <View style={styles.passengerCounter}>
              <Ionicons name="person-outline" size={15} color={colors.textSecondary} />
              <Text style={styles.passengerValue}>{passengers} Seat</Text>
              <View style={styles.counterBtns}>
                <TouchableOpacity
                  onPress={() => setPassengers((p) => Math.max(1, p - 1))}
                  style={styles.counterBtn}
                >
                  <Ionicons name="remove" size={13} color="#0F172A" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setPassengers((p) => Math.min(4, p + 1))}
                  style={styles.counterBtn}
                >
                  <Ionicons name="add" size={13} color="#0F172A" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Quick Filter Chips */}
          <View style={styles.preferenceRow}>
            <TouchableOpacity
              style={[styles.prefChip, selectedFilter === 'ladies' && styles.prefChipLadiesActive]}
              onPress={() => setSelectedFilter((prev) => (prev === 'ladies' ? 'all' : 'ladies'))}
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
            style={[styles.searchBtn, !isRouteReady && styles.searchBtnDisabled]}
            onPress={handleSearchCarpools}
            activeOpacity={0.88}
          >
            <Ionicons name="search" size={18} color="#FFFFFF" />
            <Text style={styles.searchBtnText}>Search Rides</Text>
          </TouchableOpacity>
        </View>

        {/* Recently Published Rides (Real Supabase Rides) */}
        {activeRides.length > 0 && (
          <View style={styles.publishedRidesSection}>
            <Text style={styles.sectionTitle}>Recently Published Carpools</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.popularScroll}>
              {activeRides.map((ride) => (
                <TouchableOpacity
                  key={ride.id}
                  style={styles.routeChip}
                  onPress={() => {
                    setPickupText(ride.origin.city);
                    setDropText(ride.destination.city);
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
          </View>
        )}

        {/* Publish a Ride Callout */}
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
            <Text style={styles.publishSub}>Share empty seats, split fuel costs.</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Safety Hub Modal */}
      <SafetyModal
        visible={isSafetyVisible}
        onClose={() => setIsSafetyVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  /* Top Rapido Header */
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  topHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  forMeDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.pill,
    backgroundColor: '#FFFFFF',
  },
  forMeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
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
    fontWeight: '700',
    color: '#059669',
  },

  scrollContent: {
    paddingBottom: spacing.huge,
  },

  /* Alert Banner (Rapido Style) */
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  alertIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFE4E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    lineHeight: 16,
  },

  /* Dual Route Card (Rapido Exact Design) */
  routeCard: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    backgroundColor: '#FFFFFF',
  },
  routeIndicatorCol: {
    width: 24,
    alignItems: 'center',
    paddingTop: 14,
    marginRight: 10,
  },
  pickupGreenRing: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  pickupGreenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  dottedConnectorLine: {
    width: 1.5,
    height: 38,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginVertical: 4,
  },
  dropOrangeCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Inputs Column */
  inputsCol: {
    flex: 1,
    gap: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputRowFocused: {
    borderColor: '#0284C7',
    backgroundColor: '#FFFFFF',
  },
  textInputField: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    padding: 0,
  },
  plusBtn: {
    padding: 2,
  },

  /* Map Pill Button */
  mapPillContainer: {
    paddingHorizontal: spacing.lg,
    marginTop: 8,
    marginBottom: spacing.xs,
  },
  mapPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.pill,
  },
  mapPillBtnActive: {
    backgroundColor: colors.primary,
  },
  mapPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  mapPillTextActive: {
    color: '#FFFFFF',
  },

  /* Map Wrapper */
  mapWrapper: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  /* Searching Indicator */
  searchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
  },
  searchingText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  /* Locations List */
  locationsListContainer: {
    marginTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  locationListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  itemIconCol: {
    width: 28,
    alignItems: 'flex-start',
  },
  itemTextCol: {
    flex: 1,
    marginRight: 10,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  itemSubtitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '400',
  },
  heartBtn: {
    padding: 4,
  },

  /* Booking Controls Card */
  bookingControlsCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: '#F8FAFC',
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateToggleRow: {
    flexDirection: 'row',
    gap: 4,
  },
  dateChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dateChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  dateChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  passengerCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  passengerValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  counterBtns: {
    flexDirection: 'row',
    gap: 2,
    marginLeft: 4,
  },
  counterBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  preferenceRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: spacing.sm,
  },
  prefChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    borderRadius: borderRadius.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  prefChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  prefChipLadiesActive: {
    backgroundColor: '#FCE7F3',
    borderColor: '#F472B6',
  },
  prefChipLadiesTextActive: {
    color: '#BE185D',
    fontWeight: '700',
  },
  prefChipInstantActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#6EE7B7',
  },
  prefChipInstantTextActive: {
    color: '#059669',
    fontWeight: '700',
  },
  prefChipMax2Active: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  prefChipMax2TextActive: {
    color: '#0284C7',
    fontWeight: '700',
  },

  searchBtn: {
    backgroundColor: colors.primary,
    height: 46,
    borderRadius: borderRadius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    ...shadows.sm,
  },
  searchBtnDisabled: {
    opacity: 0.6,
  },
  searchBtnText: {
    fontSize: typography.fontSizes.base,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Published Rides Section */
  publishedRidesSection: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: spacing.xs,
  },
  popularScroll: {
    marginBottom: spacing.sm,
  },
  routeChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minWidth: 160,
  },
  routeChipRoute: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  routeChipBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  routeChipPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },
  routeChipTime: {
    fontSize: 11,
    color: '#64748B',
  },

  /* Publish Banner */
  publishBanner: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  publishIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  publishSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
});

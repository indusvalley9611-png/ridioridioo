/**
 * NEXORA RIDE — Home Screen
 *
 * Modern full-screen map layout:
 * - Full-screen SmartMap as background
 * - Floating top header with NEXORA RIDE logo + Safety badge
 * - Bottom floating card with:
 *     - "Find a carpool ride" title
 *     - From / To location inputs with green/orange dots and connector
 *     - Date pill (Today / Tomorrow) + Seat counter
 *     - Filter pills: Ladies Only | Instant | Max 2 Back
 *     - Prominent "Search Rides" lime CTA button
 *     - Trust strip: ID Verified · Regulated Cost Sharing · Passenger Rating
 *     - "Driving somewhere?" banner
 * - Autocomplete overlay panel (slides up over card)
 * - Recent searches with history icon + heart
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Keyboard,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows } from '@/theme/tokens';
import { SmartMap } from '@/components/map/SmartMap';
import { triggerHaptic } from '@/utils/haptics';
import { RealGeocodingProvider } from '@/services/geocoding';
import { getRecentSearches, addRecentSearch } from '@/services/recentSearches';
import { useTrip } from '@/context/TripContext';
import type { PlaceSuggestion, RecentSearch, ResolvedLocation } from '@/models/types';

const geocoder = new RealGeocodingProvider();
const DEBOUNCE_MS = 150;
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type FocusedField = 'pickup' | 'destination' | null;
type DateFilter = 'Today' | 'Tomorrow';

export default function HomeScreen() {
  const router = useRouter();
  const { trip, setPickup, setDestination } = useTrip();

  const [activeField, setActiveField] = useState<FocusedField>(null);
  const [pickupText, setPickupText] = useState(trip.pickup?.name || '');
  const [dropText, setDropText] = useState(trip.destination?.name || '');
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceSuggestion[]>([]);
  const [recentList, setRecentList] = useState<RecentSearch[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [dateFilter, setDateFilter] = useState<DateFilter>('Today');
  const [seats, setSeats] = useState(1);
  const [filterLadies, setFilterLadies] = useState(false);
  const [filterInstant, setFilterInstant] = useState(false);
  const [filterMax2, setFilterMax2] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);

  // Slide-up animation for autocomplete panel
  const slideAnim = useRef(new Animated.Value(300)).current;

  const pickupInputRef = useRef<any>(null);
  const dropInputRef = useRef<any>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchSeqRef = useRef(0);

  // Sync TripContext
  useEffect(() => {
    if (trip.pickup) setPickupText(trip.pickup.name);
    if (trip.destination) setDropText(trip.destination.name);
  }, [trip.pickup, trip.destination]);

  // Load recents
  useEffect(() => {
    getRecentSearches().then(setRecentList);
  }, []);

  // Show/hide autocomplete with animation
  const openAutocomplete = (field: FocusedField) => {
    setActiveField(field);
    setShowAutocomplete(true);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 10,
    }).start();
  };

  const closeAutocomplete = () => {
    Animated.timing(slideAnim, {
      toValue: 300,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowAutocomplete(false);
      setActiveField(null);
      setQuery('');
      setSearchResults([]);
    });
    Keyboard.dismiss();
  };

  // Debounced search
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
        if (seq === searchSeqRef.current) setSearchResults(suggestions);
      } catch {
        // silent
      } finally {
        if (seq === searchSeqRef.current) setIsSearching(false);
      }
    }, DEBOUNCE_MS);
  }, []);

  const handlePickupChange = (text: string) => {
    setPickupText(text);
    handleQuerySearch(text);
  };

  const handleDropChange = (text: string) => {
    setDropText(text);
    handleQuerySearch(text);
  };

  const toggleFavorite = (id: string) => {
    triggerHaptic.selection();
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
      if (!dropText.trim()) {
        // Switch to destination
        setActiveField('destination');
        setQuery('');
        setSearchResults([]);
        setTimeout(() => dropInputRef.current?.focus?.(), 150);
      } else {
        closeAutocomplete();
        navigateToResults(resolved.name, dropText);
      }
    } else {
      setDestination(resolved);
      setDropText(resolved.name);
      if (pickupText.trim()) {
        closeAutocomplete();
        navigateToResults(pickupText, resolved.name);
      } else {
        setActiveField('pickup');
        setQuery('');
        setSearchResults([]);
        setTimeout(() => pickupInputRef.current?.focus?.(), 150);
      }
    }
  };

  const navigateToResults = (origin: string, dest: string) => {
    triggerHaptic.impactMedium();
    router.push({
      pathname: '/carpool-results' as any,
      params: { origin: origin.trim(), destination: dest.trim(), seats: String(seats) },
    });
  };

  const handleSearch = () => {
    if (pickupText.trim() && dropText.trim()) {
      navigateToResults(pickupText, dropText);
    } else if (!pickupText.trim()) {
      openAutocomplete('pickup');
      setTimeout(() => pickupInputRef.current?.focus?.(), 300);
    } else {
      openAutocomplete('destination');
      setTimeout(() => dropInputRef.current?.focus?.(), 300);
    }
  };

  const isRouteReady = pickupText.trim().length > 0 && dropText.trim().length > 0;
  const displayList = query.trim().length > 0 ? searchResults : recentList;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* ─── Full-Screen Map Background ─── */}
      <View style={styles.mapBackground}>
        <SmartMap
          pickup={trip.pickup?.coordinates}
          destination={trip.destination?.coordinates}
          pickupLabel={pickupText || 'Pickup'}
          destinationLabel={dropText || 'Drop'}
          height={SCREEN_HEIGHT}
        />
      </View>

      {/* ─── Floating Top Header ─── */}
      <SafeAreaView edges={['top']} style={styles.topHeaderSafe}>
        <View style={styles.topHeader}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logoIconBox}>
              <MaterialCommunityIcons name="car-multiple" size={18} color="#FFFFFF" />
            </View>
            <Text style={styles.logoText}>RIDE</Text>
          </View>

          {/* 24x7 Safety Badge */}
          <TouchableOpacity style={styles.safetyBadge} activeOpacity={0.8}>
            <Ionicons name="shield-checkmark" size={14} color="#10B981" />
            <Text style={styles.safetyBadgeText}>24x7 Safety</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* ─── Bottom Floating Card ─── */}
      <View style={styles.bottomCard}>
        {/* Card Handle */}
        <View style={styles.cardHandle} />

        {/* Title */}
        <Text style={styles.cardTitle}>Find a carpool ride</Text>

        {/* Route Inputs */}
        <View style={styles.routeRow}>
          {/* Left indicator */}
          <View style={styles.routeIndicatorCol}>
            <View style={styles.pickupDot} />
            <View style={styles.connectorLine} />
            <View style={styles.dropDot} />
          </View>

          {/* Input Fields */}
          <View style={styles.inputsCol}>
            {/* Pickup */}
            <TouchableOpacity
              style={styles.inputTouchable}
              onPress={() => {
                openAutocomplete('pickup');
                setTimeout(() => pickupInputRef.current?.focus?.(), 300);
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.inputPlaceholder, pickupText ? styles.inputValueText : null]}
                numberOfLines={1}
              >
                {pickupText || 'Leaving from'}
              </Text>
            </TouchableOpacity>

            <View style={styles.inputDivider} />

            {/* Drop */}
            <TouchableOpacity
              style={styles.inputTouchable}
              onPress={() => {
                openAutocomplete('destination');
                setTimeout(() => dropInputRef.current?.focus?.(), 300);
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.inputPlaceholder, dropText ? styles.inputValueText : null]}
                numberOfLines={1}
              >
                {dropText || 'Going to'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Swap Button */}
          <TouchableOpacity
            style={styles.swapBtn}
            onPress={() => {
              triggerHaptic.selection();
              const tmp = pickupText;
              const tmpLoc = trip.pickup;
              setPickupText(dropText);
              setPickup(trip.destination);
              setDropText(tmp);
              setDestination(tmpLoc);
            }}
            hitSlop={8}
          >
            <MaterialCommunityIcons name="swap-vertical" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Date + Seat Row */}
        <View style={styles.dateSeatsRow}>
          {/* Date Pills */}
          <View style={styles.datePills}>
            {(['Today', 'Tomorrow'] as DateFilter[]).map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.datePill, dateFilter === d && styles.datePillActive]}
                onPress={() => { triggerHaptic.selection(); setDateFilter(d); }}
              >
                <Ionicons
                  name="calendar-outline"
                  size={12}
                  color={dateFilter === d ? colors.accentText : '#64748B'}
                />
                <Text style={[styles.datePillText, dateFilter === d && styles.datePillTextActive]}>
                  {d}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Seat Counter */}
          <View style={styles.seatCounter}>
            <TouchableOpacity
              style={styles.seatBtn}
              onPress={() => { if (seats > 1) setSeats(seats - 1); }}
              hitSlop={6}
            >
              <Ionicons name="remove" size={16} color={colors.primary} />
            </TouchableOpacity>
            <Ionicons name="person-outline" size={14} color={colors.primary} />
            <Text style={styles.seatCountText}>{seats}</Text>
            <TouchableOpacity
              style={styles.seatBtn}
              onPress={() => { if (seats < 4) setSeats(seats + 1); }}
              hitSlop={6}
            >
              <Ionicons name="add" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Filter Pills Row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScrollRow}
          contentContainerStyle={styles.filterScrollContent}
        >
          <TouchableOpacity
            style={[styles.filterPill, filterLadies && styles.filterPillActive]}
            onPress={() => { triggerHaptic.selection(); setFilterLadies(!filterLadies); }}
          >
            <Ionicons
              name="heart"
              size={12}
              color={filterLadies ? colors.accentText : '#64748B'}
            />
            <Text style={[styles.filterPillText, filterLadies && styles.filterPillTextActive]}>
              Ladies Only
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, filterInstant && styles.filterPillActive]}
            onPress={() => { triggerHaptic.selection(); setFilterInstant(!filterInstant); }}
          >
            <Ionicons
              name="flash"
              size={12}
              color={filterInstant ? colors.accentText : '#64748B'}
            />
            <Text style={[styles.filterPillText, filterInstant && styles.filterPillTextActive]}>
              Instant
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, filterMax2 && styles.filterPillActive]}
            onPress={() => { triggerHaptic.selection(); setFilterMax2(!filterMax2); }}
          >
            <Ionicons
              name="people"
              size={12}
              color={filterMax2 ? colors.accentText : '#64748B'}
            />
            <Text style={[styles.filterPillText, filterMax2 && styles.filterPillTextActive]}>
              Max 2 Back
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Search Rides CTA */}
        <TouchableOpacity
          style={[styles.searchBtn, isRouteReady && styles.searchBtnReady]}
          onPress={handleSearch}
          activeOpacity={0.88}
        >
          <Ionicons name="search" size={18} color={isRouteReady ? colors.accentText : '#FFFFFF'} />
          <Text style={[styles.searchBtnText, isRouteReady && styles.searchBtnTextReady]}>
            Search Rides
          </Text>
        </TouchableOpacity>

        {/* Trust Strip */}
        <View style={styles.trustStrip}>
          <View style={styles.trustItem}>
            <Ionicons name="checkmark-circle" size={13} color="#10B981" />
            <Text style={styles.trustText}>ID Verified</Text>
          </View>
          <View style={styles.trustDot} />
          <View style={styles.trustItem}>
            <Ionicons name="cash-outline" size={13} color="#10B981" />
            <Text style={styles.trustText}>Regulated Cost Sharing</Text>
          </View>
          <View style={styles.trustDot} />
          <View style={styles.trustItem}>
            <Ionicons name="star" size={13} color="#10B981" />
            <Text style={styles.trustText}>Passenger Rating</Text>
          </View>
        </View>

        {/* Driving Banner */}
        <TouchableOpacity
          style={styles.drivingBanner}
          onPress={() => router.push('/(tabs)/publish' as any)}
          activeOpacity={0.8}
        >
          <View style={styles.drivingBannerLeft}>
            <View style={styles.drivingIconCircle}>
              <MaterialCommunityIcons name="steering" size={20} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.drivingBannerTitle}>Driving somewhere?</Text>
              <Text style={styles.drivingBannerSub}>Share your ride, split fuel costs.</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      {/* ─── Autocomplete Overlay Panel ─── */}
      {showAutocomplete && (
        <View style={styles.autocompleteOverlay}>
          {/* Backdrop */}
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={closeAutocomplete}
          />

          {/* Slide-up panel */}
          <Animated.View
            style={[styles.autocompletePanel, { transform: [{ translateY: slideAnim }] }]}
          >
            {/* Panel Header */}
            <SafeAreaView edges={['bottom']}>
              <View style={styles.panelHeader}>
                <TouchableOpacity
                  style={styles.panelBackBtn}
                  onPress={closeAutocomplete}
                  hitSlop={12}
                >
                  <Ionicons name="arrow-back" size={22} color={colors.primary} />
                </TouchableOpacity>
                <Text style={styles.panelHeaderTitle}>
                  {activeField === 'pickup' ? 'From where?' : 'Going to?'}
                </Text>
              </View>

              {/* Panel Input */}
              <View style={styles.panelInputRow}>
                <View style={[
                  styles.panelInputDot,
                  activeField === 'pickup' ? styles.panelInputDotPickup : styles.panelInputDotDrop,
                ]} />
                <TextInput
                  ref={activeField === 'pickup' ? pickupInputRef : dropInputRef}
                  style={styles.panelTextInput}
                  placeholder={activeField === 'pickup' ? 'City, station, or area' : 'City, station, or area'}
                  placeholderTextColor="#94A3B8"
                  value={activeField === 'pickup' ? pickupText : dropText}
                  onChangeText={activeField === 'pickup' ? handlePickupChange : handleDropChange}
                  autoFocus
                  returnKeyType="search"
                  autoCorrect={false}
                />
                {(activeField === 'pickup' ? pickupText : dropText).length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      if (activeField === 'pickup') {
                        setPickupText('');
                        setPickup(null);
                      } else {
                        setDropText('');
                        setDestination(null);
                      }
                      setQuery('');
                      setSearchResults([]);
                    }}
                    hitSlop={8}
                  >
                    <Ionicons name="close-circle" size={20} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Search Loading */}
              {isSearching && (
                <View style={styles.searchingRow}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.searchingText}>Searching across India...</Text>
                </View>
              )}

              {/* Results List */}
              <ScrollView
                keyboardShouldPersistTaps="always"
                showsVerticalScrollIndicator={false}
                style={styles.resultsList}
              >
                {displayList.map((item, idx) => {
                  const loc = 'location' in item ? item.location : item;
                  const itemId = loc.placeId || loc.name;
                  const isFav = favorites.has(itemId);
                  const isRecent = 'location' in item || query.trim().length === 0;

                  return (
                    <TouchableOpacity
                      key={itemId || `loc-${idx}`}
                      style={styles.resultItem}
                      onPress={() => handleSelectLocation(loc)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.resultIconWrap}>
                        {isRecent ? (
                          <MaterialCommunityIcons name="history" size={22} color="#64748B" />
                        ) : (
                          <Ionicons name="location-outline" size={20} color={colors.primary} />
                        )}
                      </View>
                      <View style={styles.resultTextCol}>
                        <Text style={styles.resultTitle} numberOfLines={1}>{loc.name}</Text>
                        <Text style={styles.resultSubtitle} numberOfLines={1}>{loc.address}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.heartBtn}
                        onPress={() => toggleFavorite(itemId)}
                        hitSlop={8}
                      >
                        <MaterialCommunityIcons
                          name={isFav ? 'heart' : 'heart-outline'}
                          size={20}
                          color={isFav ? '#E11D48' : '#CBD5E1'}
                        />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })}
                {displayList.length === 0 && !isSearching && query.trim().length > 0 && (
                  <View style={styles.emptySearchState}>
                    <Text style={styles.emptySearchText}>No results for "{query}"</Text>
                    <Text style={styles.emptySearchSub}>Try a different city or station name</Text>
                  </View>
                )}
                <View style={{ height: 40 }} />
              </ScrollView>
            </SafeAreaView>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8EDF2',
  },

  /* ─── Map Background ─── */
  mapBackground: {
    ...StyleSheet.absoluteFill,
  },

  /* ─── Floating Top Header ─── */
  topHeaderSafe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: borderRadius.pill,
  },
  logoIconBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  safetyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: borderRadius.pill,
    ...shadows.sm,
  },
  safetyBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
  },

  /* ─── Bottom Floating Card ─── */
  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    ...shadows.lg,
  },
  cardHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 14,
  },

  /* ─── Route Row ─── */
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  routeIndicatorCol: {
    width: 20,
    alignItems: 'center',
    marginRight: 10,
  },
  pickupDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#D1FAE5',
  },
  connectorLine: {
    width: 2,
    height: 28,
    backgroundColor: '#E2E8F0',
    marginVertical: 3,
  },
  dropDot: {
    width: 12,
    height: 12,
    borderRadius: 3,
    backgroundColor: '#F97316',
  },
  inputsCol: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  inputTouchable: {
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  inputPlaceholder: {
    fontSize: 14,
    fontWeight: '400',
    color: '#94A3B8',
  },
  inputValueText: {
    color: colors.primary,
    fontWeight: '600',
  },
  inputDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 14,
  },
  swapBtn: {
    marginLeft: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  /* ─── Date + Seats Row ─── */
  dateSeatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  datePills: {
    flexDirection: 'row',
    gap: 8,
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: borderRadius.pill,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  datePillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  datePillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  datePillTextActive: {
    color: '#FFFFFF',
  },
  seatCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  seatBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seatCountText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },

  /* ─── Filter Pills ─── */
  filterScrollRow: {
    marginBottom: 14,
  },
  filterScrollContent: {
    gap: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.pill,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterPillActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  filterPillTextActive: {
    color: colors.accentText,
  },

  /* ─── Search CTA Button ─── */
  searchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    height: 52,
    borderRadius: borderRadius.pill,
    marginBottom: 14,
  },
  searchBtnReady: {
    backgroundColor: colors.accent,
    ...shadows.glowLime,
  },
  searchBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  searchBtnTextReady: {
    color: colors.accentText,
  },

  /* ─── Trust Strip ─── */
  trustStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 14,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trustText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
  },
  trustDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#CBD5E1',
  },

  /* ─── Driving Banner ─── */
  drivingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  drivingBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  drivingIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drivingBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 2,
  },
  drivingBannerSub: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '400',
  },

  /* ─── Autocomplete Overlay ─── */
  autocompleteOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 100,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  autocompletePanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.85,
    ...shadows.lg,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  panelBackBtn: {
    padding: 2,
  },
  panelHeaderTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.primary,
  },
  panelInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  panelInputDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  panelInputDotPickup: {
    backgroundColor: '#10B981',
  },
  panelInputDotDrop: {
    backgroundColor: '#F97316',
  },
  panelTextInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    padding: 0,
  },
  searchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchingText: {
    fontSize: 13,
    color: '#64748B',
  },
  resultsList: {
    maxHeight: SCREEN_HEIGHT * 0.5,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  resultIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  resultTextCol: {
    flex: 1,
    paddingRight: 8,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 2,
  },
  resultSubtitle: {
    fontSize: 13,
    color: '#64748B',
  },
  heartBtn: {
    padding: 6,
  },
  emptySearchState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptySearchText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 6,
  },
  emptySearchSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
});

/**
 * NEXORA RIDE — Home Screen
 *
 * 100% Pixel-Perfect Match to Rapido Search Interface (Pic 2):
 * - Top Navigation: [←] Back Arrow + [For me ▾] pill dropdown
 * - Alert: "Uh oh, we can't find you! Enter your pickup location for a smooth ride."
 * - Dual Route Card:
 *     🟢 Concentric green circle + [Pickup location] + [+] button
 *     ┆  Dotted connector line
 *     🟠 Orange down-arrow circle + [Drop location]
 * - 📍 [Map] pill button (toggles interactive Indian map preview)
 * - Full-screen Recent Searches List with dashed dividers:
 *     🕒 History icon | Bold Title | Address Subtitle | 🤍 Favorite Heart
 * - Instant partial-word autocomplete (150ms debounce) for Indian transit points
 * - Floating "View Rides" button when both pickup & drop are selected
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

  // Dropdown "For me" state
  const [forMeMenuVisible, setForMeMenuVisible] = useState(false);
  const [ridePassengerLabel, setRidePassengerLabel] = useState('For me');

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

  // Safe back handler
  const handleBack = () => {
    triggerHaptic.selection();
    if (router.canGoBack()) {
      router.back();
    } else {
      // Clear inputs if at root
      setPickupText('');
      setDropText('');
      setPickup(null);
      setDestination(null);
      setQuery('');
      setSearchResults([]);
    }
  };

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
        // Both filled -> navigate or show map
        navigateToResults(resolved.name, dropText);
      }
    } else {
      setDestination(resolved);
      setDropText(resolved.name);
      setQuery('');
      setSearchResults([]);

      if (pickupText.trim()) {
        // Both filled -> navigate directly to rides
        navigateToResults(pickupText, resolved.name);
      } else {
        // Prompt user to enter pickup
        setActiveField('pickup');
        setTimeout(() => {
          pickupInputRef.current?.focus?.();
        }, 150);
      }
    }
  };

  const navigateToResults = (origin: string, dest: string) => {
    triggerHaptic.impactMedium();
    router.push({
      pathname: '/carpool-results' as any,
      params: {
        origin: origin.trim(),
        destination: dest.trim(),
        seats: '1',
      },
    });
  };

  const isRouteReady = pickupText.trim().length > 0 && dropText.trim().length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />

      {/* ─── Top Rapido Header: [←] and [For me ▾] ─── */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={handleBack}
          hitSlop={12}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.forMeDropdown}
          onPress={() => {
            triggerHaptic.selection();
            setForMeMenuVisible(!forMeMenuVisible);
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.forMeText}>{ridePassengerLabel}</Text>
          <Ionicons name="chevron-down" size={14} color="#0F172A" />
        </TouchableOpacity>
      </View>

      {/* For Me Dropdown Modal / Popover */}
      {forMeMenuVisible && (
        <View style={styles.dropdownMenu}>
          <TouchableOpacity
            style={styles.dropdownMenuItem}
            onPress={() => {
              setRidePassengerLabel('For me');
              setForMeMenuVisible(false);
            }}
          >
            <Ionicons name="person" size={16} color="#0F172A" />
            <Text style={styles.dropdownMenuText}>For me</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dropdownMenuItem}
            onPress={() => {
              setRidePassengerLabel('For someone else');
              setForMeMenuVisible(false);
            }}
          >
            <Ionicons name="people" size={16} color="#0F172A" />
            <Text style={styles.dropdownMenuText}>For someone else</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
      >
        {/* ─── Contextual Alert Banner (Rapido Exact) ─── */}
        {!pickupText.trim() && (
          <View style={styles.alertBanner}>
            <View style={styles.alertIconCircle}>
              <Ionicons name="information" size={16} color="#FFFFFF" />
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
              <Ionicons name="arrow-down" size={10} color="#FFFFFF" />
            </View>
          </View>

          {/* Right Side: Inputs */}
          <View style={styles.inputsCol}>
            {/* Pickup Input Box */}
            <View style={[styles.inputBox, activeField === 'pickup' && styles.inputBoxFocused]}>
              <TextInput
                ref={pickupInputRef}
                style={styles.textInputField}
                placeholder="Pickup location"
                placeholderTextColor="#64748B"
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
                  onPress={() => {
                    setActiveField('pickup');
                    pickupInputRef.current?.focus?.();
                  }}
                  hitSlop={8}
                  style={styles.plusBtn}
                >
                  <Ionicons name="add" size={22} color="#0F172A" />
                </TouchableOpacity>
              )}
            </View>

            {/* Drop Location Input Box */}
            <View style={[styles.inputBox, styles.dropInputBox, activeField === 'destination' && styles.inputBoxFocused]}>
              <TextInput
                ref={dropInputRef}
                style={styles.textInputField}
                placeholder="Drop location"
                placeholderTextColor="#64748B"
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

        {/* ─── Map Pill Button ─── */}
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
              size={15}
              color={showMap ? '#FFFFFF' : '#0F172A'}
            />
            <Text style={[styles.mapPillText, showMap && styles.mapPillTextActive]}>
              Map
            </Text>
          </TouchableOpacity>
        </View>

        {/* ─── Interactive Map (When Map pill is active) ─── */}
        {showMap && (
          <View style={styles.mapWrapper}>
            <SmartMap
              pickup={trip.pickup?.coordinates}
              destination={trip.destination?.coordinates}
              pickupLabel={pickupText || 'Pickup'}
              destinationLabel={dropText || 'Drop'}
              height={220}
            />
          </View>
        )}

        {/* ─── Dashed Divider Line Under Map Pill ─── */}
        <View style={styles.dashedDivider} />

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
                {/* Left Icon: History Clock */}
                <View style={styles.itemIconCol}>
                  {isRecent ? (
                    <MaterialCommunityIcons name="history" size={24} color="#475569" />
                  ) : (
                    <Ionicons name="location-outline" size={22} color={colors.primary} />
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
                  <MaterialCommunityIcons
                    name={isFav ? 'heart' : 'heart-outline'}
                    size={22}
                    color={isFav ? '#E11D48' : '#94A3B8'}
                  />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ─── Bottom Floating "Search Carpools" Action (When Both Selected) ─── */}
      {isRouteReady && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.searchRidesBtn}
            onPress={() => navigateToResults(pickupText, dropText)}
            activeOpacity={0.88}
          >
            <Text style={styles.searchRidesText}>Find Available Carpools</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  /* ─── Top Rapido Header ─── */
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    padding: 4,
  },
  forMeDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: borderRadius.pill,
    backgroundColor: '#FFFFFF',
  },
  forMeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },

  dropdownMenu: {
    position: 'absolute',
    top: 55,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    zIndex: 999,
    paddingVertical: 6,
    minWidth: 160,
    ...shadows.md,
  },
  dropdownMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dropdownMenuText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },

  scrollContent: {
    paddingBottom: 40,
  },

  /* ─── Alert Banner (Rapido Exact) ─── */
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0F2',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  alertIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#334155',
    lineHeight: 18,
  },

  /* ─── Dual Route Card (Rapido Exact) ─── */
  routeCard: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 4,
    backgroundColor: '#FFFFFF',
  },
  routeIndicatorCol: {
    width: 28,
    alignItems: 'center',
    paddingTop: 13,
    marginRight: 10,
  },
  pickupGreenRing: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2.5,
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
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Inputs Column */
  inputsCol: {
    flex: 1,
    gap: 10,
  },
  inputBox: {
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#0F172A',
    borderRadius: 10,
    paddingHorizontal: 14,
  },
  dropInputBox: {
    backgroundColor: '#F8FAFC',
    borderColor: 'transparent',
  },
  inputBoxFocused: {
    borderColor: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  textInputField: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#0F172A',
    padding: 0,
  },
  plusBtn: {
    padding: 2,
  },

  /* ─── Map Pill Button ─── */
  mapPillContainer: {
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  mapPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mapPillBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
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
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  /* Dashed Divider Under Map Pill */
  dashedDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    borderStyle: 'dashed',
    marginTop: 8,
  },

  /* Searching Indicator */
  searchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchingText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },

  /* ─── Locations List ─── */
  locationsListContainer: {
    backgroundColor: '#FFFFFF',
  },
  locationListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    borderStyle: 'dashed',
  },
  itemIconCol: {
    width: 32,
    alignItems: 'flex-start',
  },
  itemTextCol: {
    flex: 1,
    paddingRight: 10,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  itemSubtitle: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '400',
  },
  heartBtn: {
    padding: 6,
  },

  /* ─── Floating Bottom Bar ─── */
  bottomBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 16,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  searchRidesBtn: {
    backgroundColor: colors.primary,
    height: 50,
    borderRadius: borderRadius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...shadows.lg,
  },
  searchRidesText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

/**
 * NEXORA RIDE — Rapido-Style Location Search Screen
 *
 * Implements exact Rapido location search experience:
 * - Dual Route Inputs: [🟢 Pickup location] and [🟠 Drop location] with connecting line
 * - "For me ▾" selector and 📍 "Map" pill button
 * - Previously searched recent locations history with clock icon 🕒 and favorite heart 🤍
 * - Instant autocomplete even on typing partial / half words ("raja", "pres", "bom", "silk")
 * - Seamless handoff to Home Carpool screen with route rendering
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '@/theme/tokens';
import type { PlaceSuggestion, RecentSearch, ResolvedLocation } from '@/models/types';
import { RealGeocodingProvider } from '@/services/geocoding';
import { getRecentSearches, addRecentSearch } from '@/services/recentSearches';
import { useTrip } from '@/context/TripContext';
import { triggerHaptic } from '@/utils/haptics';

const geocoder = new RealGeocodingProvider();
const DEBOUNCE_MS = 150; // Ultra-fast autocomplete response

type ActiveField = 'pickup' | 'destination';

interface LocationRowItem {
  id: string;
  name: string;
  address: string;
  coordinates?: { latitude: number; longitude: number };
  isRecent: boolean;
  raw: PlaceSuggestion | ResolvedLocation;
}

export default function LocationSearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode: string }>();
  const initialMode: ActiveField = params.mode === 'destination' ? 'destination' : 'pickup';

  const { trip, setPickup, setDestination } = useTrip();

  // Active focused field
  const [activeField, setActiveField] = useState<ActiveField>(initialMode);

  // Input values for both Pickup and Drop
  const [pickupText, setPickupText] = useState(trip.pickup?.name || '');
  const [dropText, setDropText] = useState(trip.destination?.name || '');

  // Search query bound to active field
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceSuggestion[]>([]);
  const [recents, setRecents] = useState<RecentSearch[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Input refs for automatic focus switching
  const pickupInputRef = useRef<any>(null);
  const dropInputRef = useRef<any>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchSeqRef = useRef(0);

  // Safe Back Navigation
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  // Load recents on launch
  useEffect(() => {
    getRecentSearches().then(setRecents);

    // Initial focus on requested field
    const timer = setTimeout(() => {
      if (initialMode === 'destination') {
        dropInputRef.current?.focus?.();
      } else {
        pickupInputRef.current?.focus?.();
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [initialMode]);

  // Debounced search when query changes
  const handleQuerySearch = useCallback((text: string) => {
    setQuery(text);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!text.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const seq = ++searchSeqRef.current;

    debounceTimer.current = setTimeout(async () => {
      try {
        const suggestions = await geocoder.searchPlaces(text);
        if (seq === searchSeqRef.current) {
          setResults(suggestions);
        }
      } catch {
        // Fallback silently
      } finally {
        if (seq === searchSeqRef.current) {
          setIsSearching(false);
        }
      }
    }, DEBOUNCE_MS);
  }, []);

  // Handle typing in Pickup field
  const handlePickupChange = (text: string) => {
    setPickupText(text);
    setActiveField('pickup');
    handleQuerySearch(text);
  };

  // Handle typing in Drop field
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

  // Select a suggestion or recent location
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

    // Save to recents
    await addRecentSearch(resolved);
    const updatedRecents = await getRecentSearches();
    setRecents(updatedRecents);

    if (activeField === 'pickup') {
      setPickup(resolved);
      setPickupText(resolved.name);
      setQuery('');
      setResults([]);

      // If drop is still empty, automatically shift focus to Drop location
      if (!dropText.trim()) {
        setActiveField('destination');
        setTimeout(() => {
          dropInputRef.current?.focus?.();
        }, 150);
      } else {
        // Both are set — return to home map
        handleBack();
      }
    } else {
      // Setting Drop location
      setDestination(resolved);
      setDropText(resolved.name);
      setQuery('');
      setResults([]);
      handleBack();
    }
  };

  // Compute unified display items for FlatList
  const displayItems: LocationRowItem[] = useMemo(() => {
    if (query.trim().length > 0) {
      return results.map((item) => ({
        id: item.placeId,
        name: item.name,
        address: item.address,
        coordinates: item.coordinates,
        isRecent: false,
        raw: item,
      }));
    }
    return recents.map((r) => ({
      id: r.location.placeId || r.location.name,
      name: r.location.name,
      address: r.location.address,
      coordinates: r.location.coordinates,
      isRecent: true,
      raw: r.location,
    }));
  }, [query, results, recents]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />

      {/* ─── Top Rapido Header ─── */}
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.forMeDropdown} activeOpacity={0.8}>
          <Text style={styles.forMeText}>For me</Text>
          <Ionicons name="chevron-down" size={14} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* ─── Rapido Alert Banner (If no pickup set) ─── */}
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

      {/* ─── Dual Route Input Container (Rapido Style) ─── */}
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
              ref={pickupInputRef as any}
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
                  setResults([]);
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

          {/* Divider */}
          <View style={styles.routeDivider} />

          {/* Drop Location Input */}
          <View style={[styles.inputRow, activeField === 'destination' && styles.inputRowFocused]}>
            <TextInput
              ref={dropInputRef as any}
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
                  setResults([]);
                }}
                hitSlop={8}
              >
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* ─── Map Pill Button (Rapido Style) ─── */}
      <View style={styles.mapPillContainer}>
        <TouchableOpacity
          style={styles.mapPillBtn}
          onPress={() => handleBack()}
          activeOpacity={0.8}
        >
          <Ionicons name="location-sharp" size={14} color="#0F172A" />
          <Text style={styles.mapPillText}>Map</Text>
        </TouchableOpacity>
      </View>

      {/* ─── Search Loading Indicator ─── */}
      {isSearching && (
        <View style={styles.searchingRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.searchingText}>Searching locations across India...</Text>
        </View>
      )}

      {/* ─── Locations List (Instant Autocomplete & Recents) ─── */}
      <FlatList
        data={displayItems}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="always"
        renderItem={({ item }) => {
          const isFav = favorites.has(item.id);

          return (
            <TouchableOpacity
              style={styles.locationListItem}
              onPress={() => handleSelectLocation(item.raw)}
              activeOpacity={0.7}
            >
              {/* Left Icon: Clock for recents, Pin for live results */}
              <View style={styles.itemIconCol}>
                {item.isRecent ? (
                  <Ionicons name="time-outline" size={20} color="#475569" />
                ) : (
                  <Ionicons name="location-outline" size={20} color={colors.primary} />
                )}
              </View>

              {/* Title & Subtitle */}
              <View style={styles.itemTextCol}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.itemSubtitle} numberOfLines={1}>
                  {item.address}
                </Text>
              </View>

              {/* Right Favorite Heart Icon */}
              <TouchableOpacity
                style={styles.heartBtn}
                onPress={() => toggleFavorite(item.id)}
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
        }}
        ListEmptyComponent={
          !isSearching && query.trim().length > 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="location-outline" size={36} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No exact location found</Text>
              <Text style={styles.emptySubtitle}>
                Try typing a broader city or landmark name in India.
              </Text>
            </View>
          ) : undefined
        }
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
  },
  backBtn: {
    padding: spacing.xs,
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

  /* Alert Banner */
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    marginHorizontal: spacing.lg,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
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

  /* Dual Route Card */
  routeCard: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginVertical: spacing.xs,
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
    borderColor: '#0284C7',
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
  routeDivider: {
    height: 0,
  },

  /* Map Pill Button */
  mapPillContainer: {
    paddingHorizontal: spacing.lg,
    marginTop: 8,
    marginBottom: spacing.sm,
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
  mapPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },

  /* Searching Row */
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

  /* List */
  listContent: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.huge,
  },
  locationListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
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

  /* Empty state */
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
});

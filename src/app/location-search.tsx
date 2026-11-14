/**
 * NEXORA RIDE — Location Search Screen
 *
 * Unified search for pickup or destination selection.
 * Uses route params to determine mode: ?mode=pickup or ?mode=destination
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Keyboard,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '@/theme/tokens';
import type { PlaceSuggestion, RecentSearch, ResolvedLocation } from '@/models/types';
import { RealGeocodingProvider } from '@/services/geocoding';
import { getRecentSearches, addRecentSearch } from '@/services/recentSearches';
import {
  checkLocationPermission,
  requestLocationPermission,
  getCurrentPosition,
  isLocationServicesEnabled,
} from '@/services/locationPermission';
import { useTrip } from '@/context/TripContext';

const geocoder = new RealGeocodingProvider();

// Debounce interval in ms
const DEBOUNCE_MS = 350;

type SearchMode = 'pickup' | 'destination';

export default function LocationSearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode: string }>();
  const mode: SearchMode = params.mode === 'pickup' ? 'pickup' : 'destination';
  const { setPickup, setDestination } = useTrip();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceSuggestion[]>([]);
  const [recents, setRecents] = useState<RecentSearch[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce tracking
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchSeqRef = useRef(0);
  const inputRef = useRef<TextInput | null>(null);

  // Load recents on mount
  useEffect(() => {
    getRecentSearches().then(setRecents);
    // Auto-focus the input
    const timer = setTimeout(() => {
      (inputRef.current as any)?.focus?.();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Debounced search
  const handleQueryChange = useCallback(
    (text: string) => {
      setQuery(text);
      setError(null);

      if (debounceTimer.current) clearTimeout(debounceTimer.current);

      if (!text.trim()) {
        setResults([]);
        setHasSearched(false);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      const seq = ++searchSeqRef.current;

      debounceTimer.current = setTimeout(async () => {
        try {
          const suggestions = await geocoder.searchPlaces(text);
          // Prevent stale results from overwriting newer ones
          if (seq === searchSeqRef.current) {
            setResults(suggestions);
            setHasSearched(true);
          }
        } catch {
          if (seq === searchSeqRef.current) {
            setError('Search failed. Please try again.');
          }
        } finally {
          if (seq === searchSeqRef.current) {
            setIsSearching(false);
          }
        }
      }, DEBOUNCE_MS);
    },
    []
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  const handleSelectSuggestion = async (suggestion: PlaceSuggestion) => {
    Keyboard.dismiss();
    setIsSearching(true);
    try {
      const resolved = await geocoder.getPlaceDetails(suggestion.placeId);
      if (resolved) {
        await addRecentSearch(resolved);
        applySelection(resolved);
      } else {
        setError('Could not resolve location details. Try again.');
      }
    } catch {
      setError('Failed to get location details.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectRecent = (recent: RecentSearch) => {
    Keyboard.dismiss();
    applySelection(recent.location);
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const applySelection = (location: ResolvedLocation) => {
    if (mode === 'pickup') {
      setPickup(location);
    } else {
      setDestination(location);
    }
    handleBack();
  };

  const handleUseCurrentLocation = async () => {
    setError(null);

    // Check if location services are enabled
    const servicesEnabled = await isLocationServicesEnabled();
    if (!servicesEnabled) {
      Alert.alert(
        'Location Services Disabled',
        'Please enable Location Services in your device settings to use current location.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Check / request permission
    const permCheck = await checkLocationPermission();
    if (permCheck.status !== 'granted') {
      // Explain why before asking
      Alert.alert(
        'Location Access Needed',
        'NEXORA RIDE needs your location to set your pickup point accurately. We only use foreground access and never track in the background.',
        [
          { text: 'Not Now', style: 'cancel' },
          {
            text: 'Allow',
            onPress: async () => {
              const result = await requestLocationPermission();
              if (result.status === 'granted') {
                fetchCurrentLocation();
              } else {
                Alert.alert(
                  'Permission Denied',
                  'You can search for a location manually, or grant location permission in Settings.',
                  [{ text: 'OK' }]
                );
              }
            },
          },
        ]
      );
      return;
    }

    fetchCurrentLocation();
  };

  const fetchCurrentLocation = async () => {
    setIsGettingLocation(true);
    try {
      const position = await getCurrentPosition(15000);
      const reversed = await geocoder.reverseGeocode(position.coords);
      if (reversed) {
        await addRecentSearch(reversed);
        applySelection(reversed);
      } else {
        // Use coordinates directly
        applySelection({
          coordinates: position.coords,
          address: `${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`,
          name: 'Current Location',
          isDemo: geocoder.isDemo,
        });
      }
    } catch {
      setError('Could not get your location. Try searching manually or retry.');
    } finally {
      setIsGettingLocation(false);
    }
  };

  const renderSuggestion = ({ item }: { item: PlaceSuggestion }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => handleSelectSuggestion(item)}
      activeOpacity={0.7}
    >
      <View style={styles.resultIconCircle}>
        <Ionicons name="location-outline" size={18} color={colors.primary} />
      </View>
      <View style={styles.resultTextContainer}>
        <Text style={styles.resultName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.resultAddress} numberOfLines={1}>{item.address}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderRecent = ({ item }: { item: RecentSearch }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => handleSelectRecent(item)}
      activeOpacity={0.7}
    >
      <View style={styles.recentIconCircle}>
        <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
      </View>
      <View style={styles.resultTextContainer}>
        <Text style={styles.resultName} numberOfLines={1}>{item.location.name}</Text>
        <Text style={styles.resultAddress} numberOfLines={1}>{item.location.address}</Text>
      </View>
    </TouchableOpacity>
  );

  const showResults = query.trim().length > 0;
  const showRecents = !showResults && recents.length > 0;
  const showNoResults = showResults && hasSearched && results.length === 0 && !isSearching;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>
            {mode === 'pickup' ? 'Set Pickup Location' : 'Where to?'}
          </Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <View style={mode === 'pickup' ? styles.pickupDot : styles.destSquare} />
          <TextInput
            ref={inputRef as any}
            style={styles.searchInput}
            placeholder={
              mode === 'pickup'
                ? 'Search pickup location...'
                : 'Search destination...'
            }
            placeholderTextColor={colors.textTertiary}
            value={query}
            onChangeText={handleQueryChange}
            selectionColor={colors.primary}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 ? (
            <TouchableOpacity
              onPress={() => {
                setQuery('');
                setResults([]);
                setHasSearched(false);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          ) : (
            <Ionicons name="search" size={18} color={colors.textTertiary} />
          )}
        </View>
      </View>

      {/* Current Location Action */}
      {mode === 'pickup' ? (
        <TouchableOpacity
          style={styles.currentLocationButton}
          onPress={handleUseCurrentLocation}
          disabled={isGettingLocation}
          activeOpacity={0.75}
        >
          {isGettingLocation ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <View style={styles.currentLocIcon}>
              <MaterialCommunityIcons name="crosshairs-gps" size={18} color={colors.primary} />
            </View>
          )}
          <View style={styles.currentLocTextContainer}>
            <Text style={styles.currentLocTitle}>
              {isGettingLocation ? 'Getting your location...' : 'Use Current Location'}
            </Text>
            <Text style={styles.currentLocSubtitle}>
              Requires location permission
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        </TouchableOpacity>
      ) : null}

      {/* Error */}
      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={16} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            onPress={() => {
              setError(null);
              if (query.trim()) handleQueryChange(query);
            }}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Searching indicator */}
      {isSearching && query.trim() ? (
        <View style={styles.searchingRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.searchingText}>Searching...</Text>
        </View>
      ) : null}

      {/* No Results */}
      {showNoResults ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="map-search-outline" size={36} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>No locations found</Text>
          <Text style={styles.emptySubtitle}>
            {geocoder.isDemo
              ? 'Try searching for Bengaluru landmarks (e.g. "Koramangala", "MG Road", "Airport")'
              : 'Try a different search term'}
          </Text>
        </View>
      ) : null}

      {/* Results List */}
      {showResults && results.length > 0 ? (
        <FlatList
          data={results}
          keyExtractor={(item) => item.placeId}
          renderItem={renderSuggestion}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : null}

      {/* Recent Searches */}
      {showRecents ? (
        <>
          <View style={styles.sectionLabel}>
            <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.sectionLabelText}>Recent Searches</Text>
          </View>
          <FlatList
            data={recents}
            keyExtractor={(_, i) => `recent-${i}`}
            renderItem={renderRecent}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  backButton: {
    marginRight: spacing.md,
    padding: spacing.xs,
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.heavy,
    color: colors.textPrimary,
  },
  headerDemoBadge: {
    backgroundColor: colors.accentSoft,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  headerDemoText: {
    fontSize: 9,
    fontWeight: typography.fontWeights.heavy,
    color: colors.accentText,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    height: 50,
    ...shadows.sm,
  },
  pickupDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
    marginRight: spacing.sm,
  },
  destSquare: {
    width: 10,
    height: 10,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSizes.base,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  currentLocIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.infoSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  currentLocTextContainer: {
    flex: 1,
  },
  currentLocTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  currentLocSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.errorSoft,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: typography.fontSizes.xs,
    color: colors.error,
  },
  retryText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  searchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  searchingText: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.huge,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg + spacing.xs,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  sectionLabelText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  recentIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  resultTextContainer: {
    flex: 1,
    marginRight: spacing.xs,
  },
  resultName: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  resultAddress: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  demoBadge: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 1,
    borderRadius: borderRadius.xs,
  },
  demoBadgeText: {
    fontSize: 8,
    fontWeight: typography.fontWeights.heavy,
    color: colors.textSecondary,
  },
});

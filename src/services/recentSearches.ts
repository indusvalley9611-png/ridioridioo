/**
 * NEXORA RIDE — Recent Searches Persistence
 *
 * Stores recent location selections using AsyncStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RecentSearch, ResolvedLocation } from '@/models/types';

const STORAGE_KEY = '@nexoraride/recent_searches';
const MAX_RECENT = 10;

/**
 * Save a location to recent searches.
 */
export async function addRecentSearch(location: ResolvedLocation): Promise<void> {
  try {
    const existing = await getRecentSearches();
    // Remove duplicate (by placeId or address)
    const filtered = existing.filter(
      (r) =>
        (r.location.placeId && r.location.placeId !== location.placeId) ||
        (!r.location.placeId && r.location.address !== location.address)
    );
    const updated: RecentSearch[] = [
      { location, timestamp: Date.now() },
      ...filtered,
    ].slice(0, MAX_RECENT);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Silently fail — non-critical feature
  }
}

const INITIAL_RECENTS: RecentSearch[] = [
  {
    location: {
      placeId: 'loc-presidency-univ',
      name: 'Presidency University Girls and Boys Hostel ...',
      address: 'Chokkanahalli, Karnataka, India',
      coordinates: { latitude: 13.1678, longitude: 77.5342 },
      isDemo: false,
    },
    timestamp: Date.now() - 1000 * 60 * 15,
  },
  {
    location: {
      placeId: 'loc-rajanukunte-bus',
      name: 'Rajanukunte Bus Station',
      address: 'Suryodaya Layout, Rajanukunte, Karnataka, India',
      coordinates: { latitude: 13.1951, longitude: 77.5528 },
      isDemo: false,
    },
    timestamp: Date.now() - 1000 * 60 * 60 * 2,
  },
  {
    location: {
      placeId: 'loc-rajanukunte',
      name: 'Rajanukunte',
      address: 'Karnataka, India',
      coordinates: { latitude: 13.1920, longitude: 77.5510 },
      isDemo: false,
    },
    timestamp: Date.now() - 1000 * 60 * 60 * 5,
  },
  {
    location: {
      placeId: 'loc-bommasandra-heelalige',
      name: 'Bommasandra - Heelalige Rd',
      address: 'Anekal, Bommasandra Village, Bommasandra, Karn...',
      coordinates: { latitude: 12.8184, longitude: 77.6912 },
      isDemo: false,
    },
    timestamp: Date.now() - 1000 * 60 * 60 * 24,
  },
];

/**
 * Get recent searches sorted by most recent first.
 */
export async function getRecentSearches(): Promise<RecentSearch[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_RECENTS;
    const parsed = JSON.parse(raw) as RecentSearch[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_RECENTS;
  } catch {
    return INITIAL_RECENTS;
  }
}

/**
 * Clear all recent searches.
 */
export async function clearRecentSearches(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // Silently fail
  }
}

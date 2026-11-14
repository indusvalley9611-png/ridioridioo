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

/**
 * Get recent searches sorted by most recent first.
 */
export async function getRecentSearches(): Promise<RecentSearch[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentSearch[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
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

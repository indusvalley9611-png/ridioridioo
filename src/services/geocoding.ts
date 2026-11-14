/**
 * NEXORA RIDE — Real Geocoding & Reverse Geocoding Service
 *
 * Real-time geocoding and reverse geocoding using native device GPS
 * and OpenStreetMap Nominatim for accurate place searches across India.
 */

import * as Location from 'expo-location';
import type { GeocodingProvider, PlaceSuggestion, ResolvedLocation, LatLng } from '@/models/types';

const POPULAR_LOCATIONS: PlaceSuggestion[] = [
  { placeId: 'loc-silkboard', name: 'Central Silk Board', address: 'Hosur Road, Bengaluru', coordinates: { latitude: 12.9175, longitude: 77.6238 }, isDemo: false },
  { placeId: 'loc-mg-road', name: 'MG Road Metro Station', address: 'MG Road, Bengaluru', coordinates: { latitude: 12.9758, longitude: 77.6045 }, isDemo: false },
  { placeId: 'loc-indiranagar', name: 'Indiranagar 100 Feet Road', address: 'Indiranagar, Bengaluru', coordinates: { latitude: 12.9784, longitude: 77.6408 }, isDemo: false },
  { placeId: 'loc-koramangala', name: 'Koramangala Sony World Signal', address: '80 Feet Road, Koramangala', coordinates: { latitude: 12.9352, longitude: 77.6245 }, isDemo: false },
  { placeId: 'loc-whitefield', name: 'ITPL Main Gate', address: 'Whitefield, Bengaluru', coordinates: { latitude: 12.9863, longitude: 77.7312 }, isDemo: false },
  { placeId: 'loc-airport', name: 'Kempegowda International Airport (BLR)', address: 'Devanahalli, Bengaluru', coordinates: { latitude: 13.1986, longitude: 77.7066 }, isDemo: false },
  { placeId: 'loc-koyambedu', name: 'Koyambedu CMBT', address: 'Inner Ring Road, Chennai', coordinates: { latitude: 13.0694, longitude: 80.1948 }, isDemo: false },
  { placeId: 'loc-vashi', name: 'Vashi Toll Plaza', address: 'Sion-Panvel Highway, Navi Mumbai', coordinates: { latitude: 19.0771, longitude: 72.9986 }, isDemo: false },
  { placeId: 'loc-wakad', name: 'Wakad Bridge', address: 'Mumbai-Pune Expressway, Pune', coordinates: { latitude: 18.5987, longitude: 73.7686 }, isDemo: false },
];

export class RealGeocodingProvider implements GeocodingProvider {
  readonly isDemo = false;

  async searchPlaces(query: string): Promise<PlaceSuggestion[]> {
    if (!query || !query.trim()) return [];
    const clean = query.trim();

    try {
      // 1. Live OpenStreetMap Nominatim Search (covers every street/city in India)
      const encoded = encodeURIComponent(clean);
      const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=5&countrycodes=in&addressdetails=1`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'NexoraRideApp/1.0' },
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return data.map((item: any) => {
            const shortName = item.name || item.display_name.split(',')[0];
            return {
              placeId: `osm-${item.place_id || item.osm_id}`,
              name: shortName,
              address: item.display_name,
              coordinates: {
                latitude: parseFloat(item.lat),
                longitude: parseFloat(item.lon),
              },
              isDemo: false,
            };
          });
        }
      }
    } catch {
      // Fallback
    }

    // 2. Native Expo Geocoder if available on device
    try {
      const geoResults = await Location.geocodeAsync(clean);
      if (geoResults && geoResults.length > 0) {
        return geoResults.slice(0, 3).map((r, i) => ({
          placeId: `expo-geo-${i}-${Date.now()}`,
          name: clean,
          address: `${clean} (${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)})`,
          coordinates: { latitude: r.latitude, longitude: r.longitude },
          isDemo: false,
        }));
      }
    } catch {
      // Fallback
    }

    // 3. Fallback to matching popular landmarks
    const lower = clean.toLowerCase();
    return POPULAR_LOCATIONS.filter(
      (p) => p.name.toLowerCase().includes(lower) || p.address.toLowerCase().includes(lower)
    );
  }

  async getPlaceDetails(placeId: string): Promise<ResolvedLocation | null> {
    const popular = POPULAR_LOCATIONS.find((p) => p.placeId === placeId);
    if (popular && popular.coordinates) {
      return {
        coordinates: popular.coordinates,
        name: popular.name,
        address: popular.address,
        isDemo: false,
        placeId: popular.placeId,
      };
    }
    return null;
  }

  async reverseGeocode(coords: LatLng): Promise<ResolvedLocation | null> {
    // 1. Try native device reverse geocode
    try {
      const results = await Location.reverseGeocodeAsync(coords);
      if (results && results.length > 0) {
        const item = results[0];
        const name = item.name || item.street || item.district || item.subregion || 'Current Location';
        const addressParts = [
          item.street,
          item.district || item.subregion,
          item.city,
          item.postalCode,
        ].filter(Boolean);
        const address = addressParts.join(', ') || `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;

        return {
          coordinates: coords,
          name,
          address,
          isDemo: false,
        };
      }
    } catch {
      // Fallback
    }

    // 2. Try Nominatim Reverse Geocoding
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'NexoraRideApp/1.0' },
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        const shortName = json.name || json.display_name.split(',')[0];
        return {
          coordinates: coords,
          name: shortName,
          address: json.display_name,
          isDemo: false,
        };
      }
    } catch {
      // Fallback
    }

    return {
      coordinates: coords,
      name: 'Pinned Location',
      address: `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`,
      isDemo: false,
    };
  }
}

export const DemoGeocodingProvider = RealGeocodingProvider;

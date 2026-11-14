/**
 * NEXORA RIDE — Fare Estimation Service
 *
 * Centralized fare calculation with configurable rules per ride category.
 * All fares are in Indian Rupees (INR).
 *
 * When no routing provider gives real road distance, the service uses
 * approximated distance and labels the estimate clearly as approximate.
 */

import type { FareConfig, FareEstimate, RouteInfo } from '@/models/types';

const FARE_CONFIGS: FareConfig[] = [
  {
    categoryId: 'bike',
    baseFare: 25,
    perKmRate: 12,
    perMinuteRate: 1,
    minimumFare: 30,
    surgeMultiplier: 1.0,
  },
  {
    categoryId: 'auto',
    baseFare: 30,
    perKmRate: 15,
    perMinuteRate: 1.5,
    minimumFare: 40,
    surgeMultiplier: 1.0,
  },
  {
    categoryId: 'cab',
    baseFare: 50,
    perKmRate: 20,
    perMinuteRate: 2,
    minimumFare: 80,
    surgeMultiplier: 1.0,
  },
];

const CATEGORY_NAMES: Record<string, string> = {
  bike: 'Nexora Bike',
  auto: 'Nexora Auto',
  cab: 'Nexora Prime Cab',
};

/**
 * Calculate fare estimate for a ride category.
 *
 * @param categoryId  - 'bike' | 'auto' | 'cab'
 * @param routeInfo   - Route data (may be estimated)
 * @param isDemo      - Whether the overall flow is in demo mode
 */
export function calculateFareEstimate(
  categoryId: 'bike' | 'auto' | 'cab',
  routeInfo: RouteInfo,
  isDemo: boolean
): FareEstimate {
  const config = FARE_CONFIGS.find((c) => c.categoryId === categoryId);
  if (!config) {
    throw new Error(`Unknown ride category: ${categoryId}`);
  }

  const { distanceKm, durationMinutes, isEstimated } = routeInfo;

  // Validate inputs
  if (distanceKm < 0 || !Number.isFinite(distanceKm)) {
    throw new Error('Invalid distance value');
  }

  const distanceFare = distanceKm * config.perKmRate;
  const durationFare = durationMinutes * config.perMinuteRate;
  const rawFare = (config.baseFare + distanceFare + durationFare) * config.surgeMultiplier;
  const fare = Math.max(config.minimumFare, Math.round(rawFare));

  // Range: ±10%
  const fareMin = Math.max(config.minimumFare, Math.floor(fare * 0.9));
  const fareMax = Math.ceil(fare * 1.1);

  const disclaimerParts: string[] = [];
  if (isEstimated) {
    disclaimerParts.push('Distance is an approximation (not based on real road routing).');
  }
  if (isDemo) {
    disclaimerParts.push('Demo estimate — not a guaranteed price.');
  }
  disclaimerParts.push('Final fare may vary based on actual route, traffic, and ride conditions.');

  return {
    categoryId,
    categoryName: CATEGORY_NAMES[categoryId] ?? categoryId,
    fare,
    fareMin,
    fareMax,
    distanceKm,
    durationMinutes: durationMinutes > 0 ? durationMinutes : null,
    isDistanceApprox: isEstimated,
    isDemo,
    currency: 'INR',
    disclaimer: disclaimerParts.join(' '),
  };
}

/**
 * Get all fare estimates for every category at once.
 */
export function calculateAllFareEstimates(
  routeInfo: RouteInfo,
  isDemo: boolean
): FareEstimate[] {
  return (['bike', 'auto', 'cab'] as const).map((cat) =>
    calculateFareEstimate(cat, routeInfo, isDemo)
  );
}

/** Get the fare config for inspection */
export function getFareConfig(categoryId: string): FareConfig | undefined {
  return FARE_CONFIGS.find((c) => c.categoryId === categoryId);
}

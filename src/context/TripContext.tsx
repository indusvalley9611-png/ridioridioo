/**
 * NEXORA RIDE — Trip Context
 *
 * Shared state for pickup, destination, ride selection, and fare estimate
 * across screens. Uses React context to avoid prop-drilling.
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { ResolvedLocation, RideCategory, FareEstimate, TripSelection } from '@/models/types';
import { RealRoadRoutingProvider } from '@/services/routing';
import { calculateFareEstimate, calculateAllFareEstimates } from '@/services/fareEstimation';

interface TripContextValue {
  trip: TripSelection;
  allFareEstimates: FareEstimate[];
  setPickup: (location: ResolvedLocation | null) => void;
  setDestination: (location: ResolvedLocation | null) => void;
  swapLocations: () => void;
  selectCategory: (category: RideCategory) => void;
  computeFares: () => Promise<void>;
  isComputingFares: boolean;
  resetTrip: () => void;
}

const routingProvider = new RealRoadRoutingProvider();

export const DEFAULT_CATEGORY: RideCategory = {
  id: 'bike',
  name: 'Nexora Bike',
  tagline: 'Fastest through peak Indian traffic',
  etaMinutes: 3,
  capacity: '1 Rider',
  iconName: 'motorbike',
  estimatedPrice: '₹25 base + ₹12/km',
  badge: 'FASTEST',
  popular: true,
};

const defaultTrip: TripSelection = {
  pickup: null,
  destination: null,
  selectedCategory: DEFAULT_CATEGORY,
  fareEstimate: null,
  routeInfo: null,
};

const TripContext = createContext<TripContextValue | undefined>(undefined);

export function TripProvider({ children }: { children: React.ReactNode }) {
  const [trip, setTrip] = useState<TripSelection>(defaultTrip);
  const [allFareEstimates, setAllFareEstimates] = useState<FareEstimate[]>([]);
  const [isComputingFares, setIsComputingFares] = useState(false);

  const setPickup = useCallback((location: ResolvedLocation | null) => {
    setTrip((prev) => ({
      ...prev,
      pickup: location,
      fareEstimate: null,
      routeInfo: null,
    }));
    setAllFareEstimates([]);
  }, []);

  const setDestination = useCallback((location: ResolvedLocation | null) => {
    setTrip((prev) => ({
      ...prev,
      destination: location,
      fareEstimate: null,
      routeInfo: null,
    }));
    setAllFareEstimates([]);
  }, []);

  const swapLocations = useCallback(() => {
    setTrip((prev) => ({
      ...prev,
      pickup: prev.destination,
      destination: prev.pickup,
      fareEstimate: null,
      routeInfo: null,
    }));
    setAllFareEstimates([]);
  }, []);

  const selectCategory = useCallback((category: RideCategory) => {
    setTrip((prev) => {
      const fareEstimate =
        prev.routeInfo && category
          ? calculateFareEstimate(
              category.id,
              prev.routeInfo,
              prev.pickup?.isDemo || prev.destination?.isDemo || routingProvider.isDemo
            )
          : null;
      return { ...prev, selectedCategory: category, fareEstimate };
    });
  }, []);

  const computeFares = useCallback(async () => {
    const { pickup, destination, selectedCategory } = trip;
    if (!pickup || !destination) return;

    setIsComputingFares(true);
    try {
      const routeInfo = await routingProvider.getRoute(
        pickup.coordinates,
        destination.coordinates
      );

      const isDemo = pickup.isDemo || destination.isDemo || routingProvider.isDemo;
      const allEstimates = calculateAllFareEstimates(routeInfo, isDemo);
      setAllFareEstimates(allEstimates);

      const currentEstimate = selectedCategory
        ? allEstimates.find((e) => e.categoryId === selectedCategory.id) ?? allEstimates[0]
        : allEstimates[0];

      setTrip((prev) => ({
        ...prev,
        routeInfo,
        fareEstimate: currentEstimate ?? null,
      }));
    } catch {
      // Keep previous state on error; UI should handle no routeInfo
    } finally {
      setIsComputingFares(false);
    }
  }, [trip]);

  const resetTrip = useCallback(() => {
    setTrip(defaultTrip);
    setAllFareEstimates([]);
  }, []);

  const value = useMemo(
    () => ({
      trip,
      allFareEstimates,
      setPickup,
      setDestination,
      swapLocations,
      selectCategory,
      computeFares,
      isComputingFares,
      resetTrip,
    }),
    [trip, allFareEstimates, setPickup, setDestination, swapLocations, selectCategory, computeFares, isComputingFares, resetTrip]
  );

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
}

export function useTrip(): TripContextValue {
  const ctx = useContext(TripContext);
  if (!ctx) {
    throw new Error('useTrip must be used within a TripProvider');
  }
  return ctx;
}

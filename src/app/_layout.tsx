import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { TripProvider } from '@/context/TripContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <TripProvider>
          <StatusBar style="auto" />
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'fade',
              contentStyle: { backgroundColor: '#101828' },
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'slide_from_right' }} />
            <Stack.Screen name="welcome" options={{ headerShown: false, animation: 'slide_from_right' }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="location-search" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
            <Stack.Screen name="ride-review" options={{ headerShown: false, animation: 'slide_from_right' }} />
            <Stack.Screen name="ride-status" options={{ headerShown: false, animation: 'slide_from_right' }} />
            <Stack.Screen name="carpool-results" options={{ headerShown: false, animation: 'slide_from_right' }} />
            <Stack.Screen name="carpool-detail" options={{ headerShown: false, animation: 'slide_from_right' }} />
            <Stack.Screen name="carpool-ticket" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
            <Stack.Screen name="chat" options={{ headerShown: false, animation: 'slide_from_right' }} />
          </Stack>
        </TripProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

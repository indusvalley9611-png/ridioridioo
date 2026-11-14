import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '@/theme/tokens';
import { BrandLogo } from '@/components/common/BrandLogo';

export default function SplashScreen() {
  const router = useRouter();
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [scaleAnim] = useState(() => new Animated.Value(0.92));
  const [pulseAnim] = useState(() => new Animated.Value(1));

  useEffect(() => {
    // Brand entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Subtle breathing pulse for lime accent
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Auto-advance after 2.4 seconds
    const timer = setTimeout(() => {
      router.replace('/onboarding');
    }, 2400);

    return () => clearTimeout(timer);
  }, [fadeAnim, scaleAnim, pulseAnim, router]);

  const handleSkipToOnboarding = () => {
    router.replace('/onboarding');
  };

  const handleSkipToWelcome = () => {
    router.replace('/welcome');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Background geometric accents */}
      <View style={styles.decorCircleTop} />
      <View style={styles.decorCircleBottom} />

      <View style={styles.centerContent}>
        <Animated.View
          style={[
            styles.brandWrapper,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Animated Glow Halo */}
          <Animated.View
            style={[
              styles.glowHalo,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />

          <BrandLogo variant="dark" size="lg" showTagline={false} />

          <View style={styles.brandTaglineContainer}>
            <Text style={styles.taglineText}>NEXT-GEN URBAN TRANSIT</Text>
            <View style={styles.limePill}>
              <Text style={styles.limePillText}>PHASE 1 UI PREVIEW</Text>
            </View>
          </View>
        </Animated.View>
      </View>

      {/* Bottom controls & Phase 1 disclaimer */}
      <View style={styles.bottomFooter}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleSkipToOnboarding}
          style={styles.actionButton}
        >
          <Text style={styles.actionButtonText}>Get Started</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.accentText} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSkipToWelcome}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.returningUserLink}
        >
          <Text style={styles.returningUserText}>
            Returning User? <Text style={styles.returningUserBold}>Go to Login</Text>
          </Text>
        </TouchableOpacity>

        <Text style={styles.versionNote}>
          v1.0.0 • Mobile UI Foundation • Standalone Android APK Ready
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
  },
  decorCircleTop: {
    position: 'absolute',
    top: -100,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(199, 243, 107, 0.04)',
  },
  decorCircleBottom: {
    position: 'absolute',
    bottom: -60,
    left: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandWrapper: {
    alignItems: 'center',
    position: 'relative',
  },
  glowHalo: {
    position: 'absolute',
    top: -20,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(199, 243, 107, 0.08)',
  },
  brandTaglineContainer: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  taglineText: {
    fontSize: typography.fontSizes.sm,
    letterSpacing: 2.5,
    color: colors.textInverseMuted,
    fontWeight: typography.fontWeights.bold,
  },
  limePill: {
    backgroundColor: 'rgba(199, 243, 107, 0.15)',
    borderColor: colors.accent,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    borderRadius: borderRadius.pill,
    marginTop: spacing.md,
  },
  limePillText: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: typography.fontWeights.heavy,
    letterSpacing: 0.8,
  },
  bottomFooter: {
    paddingBottom: spacing.lg,
    alignItems: 'center',
    width: '100%',
  },
  actionButton: {
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: borderRadius.lg,
    width: '100%',
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  actionButtonText: {
    color: colors.accentText,
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
  },
  returningUserLink: {
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  returningUserText: {
    color: colors.textInverseMuted,
    fontSize: typography.fontSizes.sm,
  },
  returningUserBold: {
    color: colors.accent,
    fontWeight: typography.fontWeights.bold,
  },
  versionNote: {
    fontSize: 10,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons, Ionicons, FontAwesome6 } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '@/theme/tokens';
import { OnboardingSlide } from '@/models/types';
import { Button } from '@/components/common/Button';
import { BrandLogo } from '@/components/common/BrandLogo';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SLIDES: OnboardingSlide[] = [
  {
    id: '1',
    badge: 'CONVENIENT URBAN COMMUTE',
    title: 'Fast & Effortless City Rides',
    subtitle: 'From daily metro hops to cross-town office commutes.',
    description:
      'Choose from two-wheelers, auto-rickshaws, and cabs designed specifically for Indian urban traffic. Instant pickup access built right for your daily rhythm.',
    icon: 'motorbike',
  },
  {
    id: '2',
    badge: 'HONEST PRICING GUARANTEE',
    title: 'Transparent Upfront Estimates',
    subtitle: 'Clear distance-based fare ranges shown before booking.',
    description:
      'No hidden surge surprises or post-trip sticker shock. Review fixed estimate ranges beforehand so you are always in complete control of your travel budget.',
    icon: 'cash-check',
  },
  {
    id: '3',
    badge: 'SAFETY & REAL-TIME VISIBILITY',
    title: 'Live Route Tracking (Coming)',
    subtitle: 'Continuous route monitoring and safety protocols.',
    description:
      'Track your journey in real time with shareable trip status and 24/7 dedicated assistance. Phase 1 previews the visual architecture ahead of live GPS dispatching.',
    icon: 'map-marker-radius',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList<OnboardingSlide>>(null);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    if (index !== activeIndex && index >= 0 && index < SLIDES.length) {
      setActiveIndex(index);
    }
  };

  const handleNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      const nextIndex = activeIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setActiveIndex(nextIndex);
    } else {
      router.push('/welcome');
    }
  };

  const handleSkip = () => {
    router.push('/welcome');
  };

  const renderIllustration = (icon: string, id: string) => {
    return (
      <View style={styles.illustrationCard}>
        {/* Decorative background grid and circles */}
        <View style={styles.illusCircleBack} />
        <View style={styles.illusCircleAccent} />

        {id === '1' && (
          <View style={styles.illusContent}>
            <View style={styles.iconCenterCircle}>
              <MaterialCommunityIcons name="motorbike" size={60} color={colors.primary} />
            </View>
            <View style={styles.floatingBadgeLeft}>
              <MaterialCommunityIcons name="lightning-bolt" size={14} color={colors.accentText} />
              <Text style={styles.floatingBadgeText}>Quick Commute</Text>
            </View>
            <View style={styles.floatingBadgeRight}>
              <MaterialCommunityIcons name="clock-fast" size={14} color={colors.primary} />
              <Text style={styles.floatingBadgeDarkText}>Sub-5 Min ETA</Text>
            </View>
          </View>
        )}

        {id === '2' && (
          <View style={styles.illusContent}>
            <View style={styles.iconCenterCircle}>
              <FontAwesome6 name="indian-rupee-sign" size={50} color={colors.primary} />
            </View>
            <View style={styles.floatingBadgeLeft}>
              <Ionicons name="shield-checkmark" size={14} color={colors.accentText} />
              <Text style={styles.floatingBadgeText}>Zero Surprises</Text>
            </View>
            <View style={styles.floatingBadgeRight}>
              <Ionicons name="receipt-outline" size={14} color={colors.primary} />
              <Text style={styles.floatingBadgeDarkText}>Upfront Fares</Text>
            </View>
          </View>
        )}

        {id === '3' && (
          <View style={styles.illusContent}>
            <View style={styles.iconCenterCircle}>
              <MaterialCommunityIcons name="map-marker-path" size={56} color={colors.primary} />
            </View>
            <View style={styles.floatingBadgeLeft}>
              <Ionicons name="navigate-circle" size={14} color={colors.accentText} />
              <Text style={styles.floatingBadgeText}>Real-Time Route</Text>
            </View>
            <View style={styles.floatingBadgeRight}>
              <Ionicons name="shield" size={14} color={colors.primary} />
              <Text style={styles.floatingBadgeDarkText}>Safety Shield</Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderSlide = ({ item }: { item: OnboardingSlide }) => {
    return (
      <View style={[styles.slideContainer, { width: SCREEN_WIDTH }]}>
        {renderIllustration(item.icon, item.id)}

        <View style={styles.slideTextContainer}>
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.badge}</Text>
            </View>
          </View>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.subtitle}>{item.subtitle}</Text>
          <Text style={styles.description}>{item.description}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      {/* Top Bar with Brand and Skip */}
      <View style={styles.topBar}>
        <BrandLogo variant="light" size="sm" showTagline={false} />
        {activeIndex < SLIDES.length - 1 ? (
          <TouchableOpacity
            onPress={handleSkip}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.skipButton}
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* Slides FlatList */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        bounces={false}
        style={styles.flatList}
      />

      {/* Bottom Controls */}
      <View style={styles.bottomControls}>
        {/* Indicators */}
        <View style={styles.indicatorContainer}>
          {SLIDES.map((_, index) => {
            const isActive = index === activeIndex;
            return (
              <View
                key={index}
                style={[
                  styles.indicatorDot,
                  isActive ? styles.indicatorActive : styles.indicatorInactive,
                ]}
              />
            );
          })}
        </View>

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <Button
            title={activeIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
            variant="primary"
            onPress={handleNext}
            style={styles.primaryBtn}
            icon={
              <Ionicons
                name="arrow-forward"
                size={18}
                color={colors.accent}
              />
            }
            iconPosition="right"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  skipButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  skipText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
  flatList: {
    flex: 1,
  },
  slideContainer: {
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  illustrationCard: {
    width: '100%',
    height: 250,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    marginBottom: spacing.xl,
    ...shadows.sm,
  },
  illusCircleBack: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.surfaceMuted,
    top: -20,
  },
  illusCircleAccent: {
    position: 'absolute',
    bottom: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(199, 243, 107, 0.35)',
  },
  illusContent: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  iconCenterCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.primary,
    ...shadows.md,
  },
  floatingBadgeLeft: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.pill,
    gap: 4,
    ...shadows.sm,
  },
  floatingBadgeText: {
    color: colors.accentText,
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
  },
  floatingBadgeRight: {
    position: 'absolute',
    top: 24,
    right: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.pill,
    gap: 4,
    ...shadows.sm,
  },
  floatingBadgeDarkText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
  },
  slideTextContainer: {
    width: '100%',
  },
  badgeRow: {
    marginBottom: spacing.xs,
  },
  badge: {
    backgroundColor: 'rgba(16, 24, 40, 0.06)',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: borderRadius.pill,
    alignSelf: 'flex-start',
  },
  badgeText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: typography.fontWeights.heavy,
    letterSpacing: 0.8,
  },
  title: {
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.heavy,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  bottomControls: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  indicatorDot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  indicatorActive: {
    width: 28,
    backgroundColor: colors.primary,
  },
  indicatorInactive: {
    width: 8,
    backgroundColor: colors.borderStrong,
  },
  buttonRow: {
    width: '100%',
  },
  primaryBtn: {
    width: '100%',
  },
});

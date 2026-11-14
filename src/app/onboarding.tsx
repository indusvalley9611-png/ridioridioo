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
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '@/theme/tokens';
import { OnboardingSlide } from '@/models/types';
import { Button } from '@/components/common/Button';
import { BrandLogo } from '@/components/common/BrandLogo';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SLIDES: OnboardingSlide[] = [
  {
    id: '1',
    badge: 'INTERCITY CARPOOLING',
    title: 'Share the Journey, Split the Cost',
    subtitle: 'Affordable intercity travel with fellow commuters.',
    description:
      'Book seats on shared cars between cities. Split fuel costs, reduce your carbon footprint, and travel more affordably than ever before.',
    icon: 'car-multiple',
  },
  {
    id: '2',
    badge: 'HONEST PRICING GUARANTEE',
    title: 'Transparent Pricing, Always',
    subtitle: 'Fixed fare shown upfront — no surge, ever.',
    description:
      'See the full price breakdown before you book. What you see is what you pay. No hidden charges, no last-minute surprises.',
    icon: 'cash-check',
  },
  {
    id: '3',
    badge: 'SAFETY & TRUST',
    title: 'Travel Safe, Travel Smart',
    subtitle: 'ID-verified drivers and 24x7 emergency support.',
    description:
      'Every driver is identity-verified. Share your live trip with family, trigger SOS anytime, and ride with a trusted community.',
    icon: 'shield-check',
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

  const renderIllustration = (_icon: string, id: string) => {
    return (
      <View style={styles.illustrationCard}>
        {id === '1' && (
          <>
            {/* Layered gradient background: lime tint top, navy bottom */}
            <View style={styles.slide1BgTop} />
            <View style={styles.slide1BgBottom} />

            <View style={styles.illusContent}>
              {/* Route graphic */}
              <View style={styles.routeRow}>
                {/* Origin pin */}
                <View style={styles.pinContainer}>
                  <View style={styles.pinCircle}>
                    <Ionicons name="location" size={16} color={colors.accentText} />
                  </View>
                  <Text style={styles.pinLabel}>From</Text>
                </View>

                {/* Dotted line + car */}
                <View style={styles.routeLineContainer}>
                  <View style={styles.dottedLine} />
                  <View style={styles.carBubble}>
                    <MaterialCommunityIcons name="car" size={22} color={colors.accentText} />
                  </View>
                </View>

                {/* Destination pin */}
                <View style={styles.pinContainer}>
                  <View style={[styles.pinCircle, styles.pinCircleNav]}>
                    <Ionicons name="flag" size={16} color={colors.textInverse} />
                  </View>
                  <Text style={styles.pinLabel}>To</Text>
                </View>
              </View>

              {/* Floating badges */}
              <View style={styles.floatingBadgeLeft}>
                <MaterialCommunityIcons name="leaf" size={12} color={colors.accentText} />
                <Text style={styles.floatingBadgeText}>0 Emissions via shared rides</Text>
              </View>
              <View style={styles.floatingBadgeRight}>
                <Ionicons name="wallet-outline" size={12} color={colors.primary} />
                <Text style={styles.floatingBadgeDarkText}>Save up to ₹800 per trip</Text>
              </View>
            </View>
          </>
        )}

        {id === '2' && (
          <>
            <View style={styles.slide2Bg} />
            <View style={styles.illusContent}>
              {/* Price breakdown card */}
              <View style={styles.priceCard}>
                <Text style={styles.priceCardTitle}>Price Breakdown</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Fare</Text>
                  <Text style={styles.priceValue}>₹700</Text>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Convenience</Text>
                  <Text style={styles.priceValue}>₹50</Text>
                </View>
                <View style={[styles.priceRow, styles.priceTotalRow]}>
                  <Text style={styles.priceTotalLabel}>Total</Text>
                  <Text style={styles.priceTotalValue}>₹750</Text>
                </View>
              </View>

              {/* Pills */}
              <View style={styles.floatingBadgeLeft}>
                <Ionicons name="checkmark-circle" size={13} color="#059669" />
                <Text style={[styles.floatingBadgeText, { color: '#065F46' }]}>No surge pricing ever</Text>
              </View>
              <View style={[styles.floatingBadgeRight, styles.navyPill]}>
                <Ionicons name="receipt-outline" size={12} color={colors.accent} />
                <Text style={[styles.floatingBadgeDarkText, { color: colors.accent }]}>Upfront fare always</Text>
              </View>
            </View>
          </>
        )}

        {id === '3' && (
          <>
            <View style={styles.slide3Bg} />
            <View style={styles.illusContent}>
              {/* Large shield icon */}
              <View style={styles.shieldContainer}>
                <MaterialCommunityIcons name="shield-check" size={52} color={colors.accentText} />
              </View>

              {/* Trust items */}
              <View style={styles.trustList}>
                <Text style={styles.trustItem}>✅ ID Verified Drivers</Text>
                <Text style={styles.trustItem}>📱 Real-time GPS sharing</Text>
                <Text style={styles.trustItem}>🆘 24x7 SOS access</Text>
              </View>

              {/* Floating badge */}
              <View style={styles.floatingBadgeLeft}>
                <MaterialCommunityIcons name="account-check" size={12} color={colors.accentText} />
                <Text style={styles.floatingBadgeText}>100% verified community</Text>
              </View>
            </View>
          </>
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
        {/* Slide counter */}
        <Text style={styles.slideCounter}>{activeIndex + 1} / {SLIDES.length}</Text>

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
    height: 260,
    borderRadius: borderRadius.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    marginBottom: spacing.xl,
    ...shadows.md,
  },
  // Slide 1 backgrounds
  slide1BgTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
    backgroundColor: colors.accentSoft,
  },
  slide1BgBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '45%',
    backgroundColor: colors.primary,
  },
  // Slide 2 background
  slide2Bg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.successSoft,
  },
  // Slide 3 background
  slide3Bg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.primary,
  },
  illusContent: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  // Route graphic (slide 1)
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    width: '100%',
  },
  pinContainer: {
    alignItems: 'center',
    gap: 4,
  },
  pinCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  pinCircleNav: {
    backgroundColor: colors.primaryLight,
  },
  pinLabel: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
    marginTop: 2,
  },
  routeLineContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 36,
    marginHorizontal: spacing.sm,
  },
  dottedLine: {
    width: '100%',
    height: 2,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 1,
  },
  carBubble: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  // Price card (slide 2)
  priceCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    width: '70%',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
  },
  priceCardTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  priceLabel: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
  },
  priceValue: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textPrimary,
  },
  priceTotalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 4,
    paddingTop: 6,
  },
  priceTotalLabel: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.heavy,
    color: colors.textPrimary,
  },
  priceTotalValue: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.heavy,
    color: colors.success,
  },
  // Shield + trust (slide 3)
  shieldContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadows.glowLime,
  },
  trustList: {
    gap: 6,
    alignItems: 'flex-start',
  },
  trustItem: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textInverse,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: borderRadius.md,
  },
  // Floating badges (shared)
  floatingBadgeLeft: {
    position: 'absolute',
    bottom: 18,
    left: 16,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: borderRadius.pill,
    gap: 4,
    ...shadows.sm,
    maxWidth: '55%',
  },
  floatingBadgeText: {
    color: colors.accentText,
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    flexShrink: 1,
  },
  floatingBadgeRight: {
    position: 'absolute',
    top: 18,
    right: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: borderRadius.pill,
    gap: 4,
    ...shadows.sm,
    maxWidth: '55%',
  },
  navyPill: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryLight,
  },
  floatingBadgeDarkText: {
    color: colors.textPrimary,
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    flexShrink: 1,
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
    alignItems: 'center',
  },
  slideCounter: {
    fontSize: typography.fontSizes.xs,
    color: colors.textTertiary,
    fontWeight: typography.fontWeights.semibold,
    marginBottom: spacing.xs,
    letterSpacing: 0.5,
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
    width: 32,
    backgroundColor: colors.accent,
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

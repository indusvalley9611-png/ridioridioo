import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, borderRadius, typography } from '@/theme/tokens';

interface BrandLogoProps {
  variant?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  style?: ViewStyle;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'light',
  size = 'md',
  showTagline = true,
  style,
}) => {
  const isDark = variant === 'dark';

  const iconSizes = {
    sm: 32,
    md: 46,
    lg: 64,
  };

  const currentIconSize = iconSizes[size];

  return (
    <View style={[styles.container, style]}>
      <View style={styles.brandRow}>
        {/* Original Hexagonal Geometric Symbol */}
        <View
          style={[
            styles.symbolContainer,
            {
              width: currentIconSize,
              height: currentIconSize,
              borderRadius: size === 'lg' ? borderRadius.xl : borderRadius.lg,
              backgroundColor: isDark ? colors.surfaceDark : colors.primary,
              borderColor: colors.accent,
            },
          ]}
        >
          {/* Inner Geometric Geometric Nexus Arrow */}
          <View style={styles.symbolInner}>
            <View style={[styles.symbolBar1, { backgroundColor: colors.accent }]} />
            <View
              style={[
                styles.symbolBar2,
                { backgroundColor: isDark ? colors.accent : colors.surface },
              ]}
            />
            <View style={styles.symbolDot} />
          </View>
        </View>

        {/* Wordmark */}
        <View style={styles.textContainer}>
          <View style={styles.wordmarkRow}>
            <Text
              style={[
                styles.wordmarkNexora,
                size === 'sm' && styles.textSm,
                size === 'md' && styles.textMd,
                size === 'lg' && styles.textLg,
                { color: isDark ? colors.textInverse : colors.primary },
              ]}
            >
              NEXORA
            </Text>
            <View
              style={[
                styles.rideBadge,
                size === 'sm' && styles.rideBadgeSm,
                size === 'lg' && styles.rideBadgeLg,
              ]}
            >
              <Text style={styles.rideBadgeText}>RIDE</Text>
            </View>
          </View>

          {showTagline ? (
            <Text
              style={[
                styles.tagline,
                { color: isDark ? colors.textTertiary : colors.textSecondary },
              ]}
            >
              Reliable Indian Urban Mobility
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  symbolContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginRight: spacing.md,
  },
  symbolInner: {
    width: '60%',
    height: '60%',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  symbolBar1: {
    position: 'absolute',
    width: '100%',
    height: 4,
    borderRadius: 2,
    transform: [{ rotate: '45deg' }],
  },
  symbolBar2: {
    position: 'absolute',
    width: '100%',
    height: 4,
    borderRadius: 2,
    transform: [{ rotate: '-45deg' }],
  },
  symbolDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
    zIndex: 2,
  },
  textContainer: {
    justifyContent: 'center',
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wordmarkNexora: {
    fontWeight: typography.fontWeights.heavy,
    letterSpacing: 1.5,
  },
  textSm: {
    fontSize: typography.fontSizes.base,
  },
  textMd: {
    fontSize: typography.fontSizes.xl,
  },
  textLg: {
    fontSize: typography.fontSizes.xxl,
  },
  rideBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 1,
    borderRadius: borderRadius.xs,
    marginLeft: spacing.xs + 2,
  },
  rideBadgeSm: {
    paddingHorizontal: 4,
  },
  rideBadgeLg: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  rideBadgeText: {
    fontSize: typography.fontSizes.xs - 1,
    fontWeight: typography.fontWeights.heavy,
    color: colors.accentText,
    letterSpacing: 0.8,
  },
  tagline: {
    fontSize: typography.fontSizes.xs,
    marginTop: 2,
    fontWeight: typography.fontWeights.medium,
  },
});

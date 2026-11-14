import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, spacing, borderRadius, typography } from '@/theme/tokens';

export type BadgeVariant = 'lime' | 'navy' | 'neutral' | 'success' | 'warning';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'lime',
  style,
  textStyle,
  icon,
}) => {
  return (
    <View
      style={[
        styles.base,
        variant === 'lime' && styles.limeBadge,
        variant === 'navy' && styles.navyBadge,
        variant === 'neutral' && styles.neutralBadge,
        variant === 'success' && styles.successBadge,
        variant === 'warning' && styles.warningBadge,
        style,
      ]}
    >
      {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
      <Text
        style={[
          styles.text,
          variant === 'lime' && styles.limeText,
          variant === 'navy' && styles.navyText,
          variant === 'neutral' && styles.neutralText,
          variant === 'success' && styles.successText,
          variant === 'warning' && styles.warningText,
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xxs + 1,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: borderRadius.pill,
    alignSelf: 'flex-start',
  },
  limeBadge: {
    backgroundColor: colors.accent,
  },
  navyBadge: {
    backgroundColor: colors.primary,
  },
  neutralBadge: {
    backgroundColor: colors.surfaceMuted,
  },
  successBadge: {
    backgroundColor: colors.successSoft,
  },
  warningBadge: {
    backgroundColor: colors.warningSoft,
  },
  iconContainer: {
    marginRight: spacing.xs,
  },
  text: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    letterSpacing: 0.3,
  },
  limeText: {
    color: colors.accentText,
  },
  navyText: {
    color: colors.textInverse,
  },
  neutralText: {
    color: colors.textSecondary,
  },
  successText: {
    color: colors.success,
  },
  warningText: {
    color: colors.warning,
  },
});

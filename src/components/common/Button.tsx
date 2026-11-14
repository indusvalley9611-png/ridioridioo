import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '@/theme/tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'lime';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
  iconPosition = 'left',
  ...props
}) => {
  const isLime = variant === 'lime';
  const isSecondary = variant === 'secondary';
  const isOutline = variant === 'outline';
  const isGhost = variant === 'ghost';

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled || loading}
      style={[
        styles.base,
        isLime && styles.limeButton,
        variant === 'primary' && styles.primaryButton,
        isSecondary && styles.secondaryButton,
        isOutline && styles.outlineButton,
        isGhost && styles.ghostButton,
        disabled && styles.disabledButton,
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={isLime ? colors.accentText : variant === 'primary' ? colors.accent : colors.textPrimary}
        />
      ) : (
        <>
          {icon && iconPosition === 'left' ? <>{icon}</> : null}
          <Text
            style={[
              styles.baseText,
              isLime && styles.limeText,
              variant === 'primary' && styles.primaryText,
              isSecondary && styles.secondaryText,
              isOutline && styles.outlineText,
              isGhost && styles.ghostText,
              disabled && styles.disabledText,
              icon ? (iconPosition === 'left' ? styles.textWithLeftIcon : styles.textWithRightIcon) : undefined,
              textStyle,
            ]}
          >
            {title}
          </Text>
          {icon && iconPosition === 'right' ? <>{icon}</> : null}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.xl,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  limeButton: {
    backgroundColor: colors.accent,
  },
  secondaryButton: {
    backgroundColor: colors.surfaceMuted,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
  },
  ghostButton: {
    backgroundColor: 'transparent',
  },
  disabledButton: {
    backgroundColor: colors.border,
    borderColor: colors.border,
    opacity: 0.65,
  },
  baseText: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.semibold,
    textAlign: 'center',
  },
  primaryText: {
    color: colors.textInverse,
  },
  limeText: {
    color: colors.accentText,
    fontWeight: typography.fontWeights.bold,
  },
  secondaryText: {
    color: colors.textPrimary,
  },
  outlineText: {
    color: colors.textPrimary,
  },
  ghostText: {
    color: colors.textSecondary,
  },
  disabledText: {
    color: colors.textTertiary,
  },
  textWithLeftIcon: {
    marginLeft: spacing.sm,
  },
  textWithRightIcon: {
    marginRight: spacing.sm,
  },
});

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '@/theme/tokens';
import { LocationShortcut } from '@/models/types';

interface LocationShortcutCardProps {
  shortcut: LocationShortcut;
  onPress?: (shortcut: LocationShortcut) => void;
}

export const LocationShortcutCard: React.FC<LocationShortcutCardProps> = ({
  shortcut,
  onPress,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      style={styles.card}
      onPress={() => onPress?.(shortcut)}
    >
      <View style={styles.iconCircle}>
        <Ionicons
          name={shortcut.icon as any}
          size={18}
          color={colors.primary}
        />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title} numberOfLines={1}>
          {shortcut.title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {shortcut.subtitle}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  textContainer: {
    flex: 1,
    marginRight: spacing.xs,
  },
  title: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
});

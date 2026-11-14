/**
 * NEXORA RIDE — Live Ride Category Card
 *
 * Shows real-time calculated fares and dynamic traffic ETAs
 * based on actual route distance and city traffic conditions.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons, FontAwesome6, Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '@/theme/tokens';
import type { RideCategory, FareEstimate } from '@/models/types';

interface RideCategoryCardProps {
  category: RideCategory;
  isSelected?: boolean;
  onSelect?: (category: RideCategory) => void;
  fareEstimate?: FareEstimate | null;
}

export const RideCategoryCard: React.FC<RideCategoryCardProps> = ({
  category,
  isSelected = false,
  onSelect,
  fareEstimate,
}) => {
  const renderCategoryIcon = () => {
    switch (category.id) {
      case 'bike':
        return <MaterialCommunityIcons name="motorbike" size={28} color={isSelected ? colors.accent : colors.primary} />;
      case 'auto':
        return <MaterialCommunityIcons name="rickshaw" size={28} color={isSelected ? colors.accent : colors.primary} />;
      case 'cab':
        return <FontAwesome6 name="car-side" size={24} color={isSelected ? colors.accent : colors.primary} />;
      default:
        return <MaterialCommunityIcons name="car" size={28} color={colors.primary} />;
    }
  };

  // Base pricing descriptions when no route is yet selected
  const getBaseRateText = () => {
    switch (category.id) {
      case 'bike':
        return '₹25 base + ₹12/km';
      case 'auto':
        return '₹30 base + ₹15/km';
      case 'cab':
        return '₹50 base + ₹18/km';
      default:
        return 'Standard metered fare';
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onSelect?.(category)}
      style={[
        styles.card,
        isSelected && styles.cardSelected,
      ]}
    >
      {category.badge ? (
        <View style={[styles.badge, isSelected && styles.badgeSelected]}>
          <Text style={[styles.badgeText, isSelected && styles.badgeTextSelected]}>
            {category.badge}
          </Text>
        </View>
      ) : null}

      <View style={[styles.iconWrapper, isSelected && styles.iconWrapperSelected]}>
        {renderCategoryIcon()}
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={[styles.name, isSelected && styles.nameSelected]}>
            {category.name}
          </Text>
          <View style={styles.capacityBadge}>
            <MaterialCommunityIcons
              name="account"
              size={12}
              color={isSelected ? colors.accent : colors.textSecondary}
            />
            <Text style={[styles.capacityText, isSelected && styles.capacityTextSelected]}>
              {category.capacity}
            </Text>
          </View>
        </View>

        <Text style={[styles.tagline, isSelected && styles.taglineSelected]}>
          {category.tagline}
        </Text>

        <View style={styles.footerRow}>
          {/* Dynamic Travel ETA & Distance */}
          {fareEstimate ? (
            <View style={styles.dynamicMetaRow}>
              <Ionicons
                name="time-outline"
                size={13}
                color={isSelected ? colors.accent : colors.textSecondary}
              />
              <Text style={[styles.eta, isSelected && styles.etaSelected]}>
                {fareEstimate.durationMinutes} mins ({fareEstimate.distanceKm} km)
              </Text>
            </View>
          ) : (
            <Text style={[styles.eta, isSelected && styles.etaSelected]}>
              ~3-5 mins pickup • {getBaseRateText()}
            </Text>
          )}

          {/* Real Calculated Live Fare */}
          <Text style={[styles.pricePreview, isSelected && styles.pricePreviewSelected]}>
            {fareEstimate ? `₹${fareEstimate.fareMin} - ₹${fareEstimate.fareMax}` : getBaseRateText()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    ...shadows.sm,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#1E293B',
  },
  badge: {
    position: 'absolute',
    top: -10,
    right: spacing.md,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.pill,
    zIndex: 1,
  },
  badgeSelected: {
    backgroundColor: colors.accent,
  },
  badgeText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.heavy,
    color: colors.accentText,
    letterSpacing: 0.5,
  },
  badgeTextSelected: {
    color: colors.accentText,
  },
  iconWrapper: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  iconWrapperSelected: {
    backgroundColor: colors.primary,
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  name: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  nameSelected: {
    color: '#FFFFFF',
  },
  capacityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  capacityText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  capacityTextSelected: {
    color: colors.accent,
  },
  tagline: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  taglineSelected: {
    color: '#94A3B8',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  dynamicMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  eta: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
  },
  etaSelected: {
    color: '#FFFFFF',
  },
  pricePreview: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.heavy,
    color: colors.primary,
  },
  pricePreviewSelected: {
    color: colors.accent,
  },
});

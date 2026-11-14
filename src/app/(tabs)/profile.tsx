/**
 * NEXORA RIDE — Profile Screen
 *
 * Clean, scannable profile with all features preserved:
 * - User info & rating
 * - Wallet
 * - Chattiness preference
 * - Verification status
 * - Vehicle details
 * - Travel preferences
 * - Logout
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '@/theme/tokens';
import type { ChattinessLevel } from '@/models/carpool';
import { kycService, DriverKycProfile } from '@/services/kycService';
import { i18n, SUPPORTED_LANGUAGES, SupportedLanguage } from '@/services/i18nService';

export default function ProfileScreen() {
  const router = useRouter();
  const [chattiness, setChattiness] = useState<ChattinessLevel>('BlaBla');
  const [kycProfile, setKycProfile] = useState<DriverKycProfile | null>(null);
  const [currentLang, setCurrentLang] = useState<SupportedLanguage>('en');

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const [kyc, lang] = await Promise.all([
          kycService.getDriverProfile(),
          i18n.getLanguage(),
        ]);
        if (isMounted) {
          setKycProfile(kyc);
          setCurrentLang(lang);
        }
      } catch {
        // Fallback
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSelectLanguage = async (code: SupportedLanguage) => {
    setCurrentLang(code);
    await i18n.setLanguage(code);
    Alert.alert('Language Updated', `App language set to ${SUPPORTED_LANGUAGES.find((l) => l.code === code)?.name} (${SUPPORTED_LANGUAGES.find((l) => l.code === code)?.nativeName})`);
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of your session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: () => router.replace('/welcome'),
        },
      ]
    );
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── User Card ── */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>G</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>Gokul R.</Text>
            <Text style={styles.userPhone}>+91 98765 43210</Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={13} color="#F59E0B" />
              <Text style={styles.ratingText}>4.95 (52 Rides)</Text>
              <View style={styles.verifiedChip}>
                <Ionicons name="checkmark-circle" size={12} color="#059669" />
                <Text style={styles.verifiedChipText}>
                  {kycProfile?.status === 'verified' ? 'KYC Verified' : 'KYC Pending'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Regional Language Selector (India) ── */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>App Language (ಭಾರತೀಯ ಭಾಷೆಗಳು)</Text>
            <Text style={styles.langActiveBadge}>
              {SUPPORTED_LANGUAGES.find((l) => l.code === currentLang)?.nativeName}
            </Text>
          </View>
          <Text style={styles.langSubtitle}>
            Select your preferred Indian regional language:
          </Text>
          <View style={styles.langGrid}>
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isSelected = currentLang === lang.code;
              return (
                <TouchableOpacity
                  key={lang.code}
                  style={[styles.langChip, isSelected && styles.langChipActive]}
                  onPress={() => handleSelectLanguage(lang.code)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.langNativeText, isSelected && styles.langNativeTextActive]}>
                    {lang.nativeName}
                  </Text>
                  <Text style={[styles.langEnglishText, isSelected && styles.langEnglishTextActive]}>
                    {lang.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Wallet ── */}
        <View style={styles.walletCard}>
          <View style={styles.walletRow}>
            <View>
              <Text style={styles.walletLabel}>WALLET</Text>
              <Text style={styles.walletAmount}>₹500.00</Text>
            </View>
            <TouchableOpacity
              style={styles.topUpBtn}
              onPress={() => Alert.alert('Add Money', 'Promo credit of ₹500 already credited to your account!')}
            >
              <Ionicons name="add" size={16} color={colors.accentText} />
              <Text style={styles.topUpBtnText}>Top Up</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="leaf" size={14} color="#059669" />
              <Text style={styles.statValue}>142 kg</Text>
              <Text style={styles.statLabel}>CO₂ Saved</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="water" size={14} color="#0284C7" />
              <Text style={styles.statValue}>48 L</Text>
              <Text style={styles.statLabel}>Fuel Shared</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="shield-checkmark" size={14} color="#D97706" />
              <Text style={styles.statValue}>100%</Text>
              <Text style={styles.statLabel}>Punctuality</Text>
            </View>
          </View>
        </View>

        {/* ── Chattiness ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Chat preference</Text>
          <View style={styles.chattinessRow}>
            {(['Bla', 'BlaBla', 'BlaBlaBla'] as const).map((level) => (
              <TouchableOpacity
                key={level}
                style={[styles.chattinessBtn, chattiness === level && styles.chattinessBtnActive]}
                onPress={() => setChattiness(level)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chattinessBtnTitle, chattiness === level && styles.chattinessBtnTitleActive]}>
                  {level}
                </Text>
                <Text style={styles.chattinessBtnDesc}>
                  {level === 'Bla' && 'Quiet'}
                  {level === 'BlaBla' && 'Chatty'}
                  {level === 'BlaBlaBla' && 'Talkative'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Verification ── */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Identity & Driver Verification</Text>
            <TouchableOpacity onPress={() => router.push('/driver-verification' as any)}>
              <Text style={styles.editLink}>Manage</Text>
            </TouchableOpacity>
          </View>
          {[
            {
              icon: 'shield-checkmark-outline' as const,
              title: 'Driver KYC & License',
              sub: kycProfile?.status === 'verified' ? 'Verified Government DL' : 'Action Required: Submit DL',
              verified: kycProfile?.status === 'verified',
            },
            {
              icon: 'finger-print-outline' as const,
              title: 'Aadhaar Identity',
              sub: kycProfile?.aadhaarLast4 ? `Masked (**** **** ${kycProfile.aadhaarLast4})` : 'Verified',
              verified: true,
            },
            {
              icon: 'call-outline' as const,
              title: 'Mobile Phone',
              sub: '+91 98765 43210 (Twilio OTP Verified)',
              verified: true,
            },
          ].map((item) => (
            <TouchableOpacity
              key={item.title}
              style={styles.verifRow}
              onPress={() => router.push('/driver-verification' as any)}
            >
              <Ionicons
                name={item.icon}
                size={18}
                color={item.verified ? '#059669' : '#D97706'}
              />
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Text style={styles.verifTitle}>{item.title}</Text>
                <Text style={styles.verifSub}>{item.sub}</Text>
              </View>
              <Ionicons
                name={item.verified ? 'checkmark-circle' : 'chevron-forward'}
                size={18}
                color={item.verified ? '#059669' : colors.textTertiary}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Vehicle ── */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>My Vehicle</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/publish' as any)}>
              <Text style={styles.editLink}>Edit</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.vehicleRow}>
            <View style={styles.vehicleIcon}>
              <Ionicons name="car-sport" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.vehicleName}>Hyundai Creta SX (O)</Text>
              <Text style={styles.vehicleDetail}>Polar White • KA 01 MJ 4291</Text>
            </View>
          </View>
        </View>

        {/* ── Preferences ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Preferences</Text>
          <View style={styles.prefRow}>
            <Ionicons name="musical-notes-outline" size={18} color={colors.primary} />
            <Text style={styles.prefText}>Music: Podcasts, Indie & Lo-Fi</Text>
          </View>
          <View style={styles.prefRow}>
            <MaterialCommunityIcons name="smoking-off" size={18} color="#EF4444" />
            <Text style={styles.prefText}>No smoking</Text>
          </View>
          <View style={styles.prefRow}>
            <Ionicons name="paw-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.prefText}>Pets welcome (in crate)</Text>
          </View>
        </View>

        {/* ── Logout ── */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          <Text style={styles.logoutBtnText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.huge,
  },

  /* User Card */
  userCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    color: colors.accent,
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.heavy,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.heavy,
    color: colors.textPrimary,
  },
  userPhone: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
  },
  ratingText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  verifiedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.pill,
    marginLeft: 4,
  },
  verifiedChipText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: '#059669',
  },
  langActiveBadge: {
    fontSize: 12,
    fontWeight: typography.fontWeights.heavy,
    color: colors.primary,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  langSubtitle: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  langGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  langChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    minWidth: '22%',
  },
  langChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  langNativeText: {
    fontSize: 12,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  langNativeTextActive: {
    color: colors.accent,
  },
  langEnglishText: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  langEnglishTextActive: {
    color: '#CBD5E1',
  },

  /* Wallet */
  walletCard: {
    backgroundColor: '#101828',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  walletRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  walletLabel: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    letterSpacing: 1,
    color: '#94A3B8',
  },
  walletAmount: {
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.heavy,
    color: '#FFFFFF',
    marginTop: 2,
  },
  topUpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.pill,
  },
  topUpBtnText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.accentText,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.heavy,
    color: '#FFFFFF',
    marginTop: 2,
  },
  statLabel: {
    fontSize: 9,
    color: '#94A3B8',
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#334155',
  },

  /* Generic Card */
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  cardTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  editLink: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: '#0284C7',
  },

  /* Chattiness */
  chattinessRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  chattinessBtn: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  chattinessBtnActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.primary,
  },
  chattinessBtnTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.heavy,
    color: colors.textSecondary,
  },
  chattinessBtnTitleActive: {
    color: colors.primary,
  },
  chattinessBtnDesc: {
    fontSize: 9,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: 1,
  },

  /* Verification */
  verifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceMuted,
  },
  verifTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textPrimary,
  },
  verifSub: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },

  /* Vehicle */
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  vehicleName: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  vehicleDetail: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },

  /* Preferences */
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  prefText: {
    fontSize: typography.fontSizes.sm,
    color: colors.textPrimary,
  },

  /* Logout */
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: 48,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
    marginTop: spacing.sm,
  },
  logoutBtnText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: '#EF4444',
  },
});

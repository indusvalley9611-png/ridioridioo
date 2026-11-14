import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '@/theme/tokens';
import { BrandLogo } from '@/components/common/BrandLogo';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { validateIndianMobileNumber } from '@/utils/validation';
import { authService } from '@/services/authService';
import { triggerHaptic } from '@/utils/haptics';

export default function WelcomeScreen() {
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [activeMode, setActiveMode] = useState<'twilio' | 'demo'>('twilio');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handlePhoneChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 10);
    setPhoneNumber(cleaned);
    if (error) setError(null);
  };

  const handleOtpChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 6);
    setOtpCode(cleaned);
    if (error) setError(null);
  };

  const handleSendOtp = async (mode: 'twilio' | 'demo') => {
    const validation = validateIndianMobileNumber(phoneNumber);
    if (!validation.isValid) {
      setError(validation.error || 'Please enter a valid 10-digit mobile number');
      triggerHaptic.error();
      return;
    }

    setIsLoading(true);
    setActiveMode(mode);
    triggerHaptic.impactLight();

    const res = await authService.sendOtp(phoneNumber, mode);
    setIsLoading(false);

    if (res.success) {
      triggerHaptic.success();
      setStep('otp');
      if (mode === 'demo') {
        setOtpCode('123456');
      }
    } else {
      setError(res.message);
      triggerHaptic.error();
      Alert.alert(
        'Twilio SMS Notice',
        res.message,
        [
          {
            text: 'Use Demo OTP (123456)',
            style: 'default',
            onPress: () => handleSendOtp('demo'),
          },
          { text: 'Close', style: 'cancel' },
        ]
      );
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length < 6) {
      setError('Please enter the 6-digit verification code.');
      triggerHaptic.error();
      return;
    }

    setIsLoading(true);
    triggerHaptic.impactMedium();

    const res = await authService.verifyOtp(phoneNumber, otpCode);
    setIsLoading(false);

    if (res.verified) {
      triggerHaptic.success();
      router.replace('/(tabs)');
    } else {
      setError(res.error || 'Invalid code. Try entering 123456 for demo.');
      triggerHaptic.error();
    }
  };

  const handleQuickExplore = () => {
    triggerHaptic.impactLight();
    router.replace('/(tabs)');
  };

  const showPolicyAlert = (title: string, type: string) => {
    Alert.alert(
      title,
      `NEXORA RIDE ${type}: Your privacy and data protection are encrypted and safeguarded under Indian telecom regulations.`,
      [{ text: 'Understood', style: 'default' }]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header & Brand */}
          <View style={styles.header}>
            <BrandLogo variant="light" size="md" showTagline={false} />
          </View>

          {/* Main Auth Card */}
          <View style={styles.mainCard}>
            {step === 'phone' ? (
              <>
                <View style={styles.titleSection}>
                  <Text style={styles.headline}>Welcome to NEXORA</Text>
                  <Text style={styles.subheadline}>
                    Enter your mobile number to get a verification code via real Twilio SMS or demo mode.
                  </Text>
                </View>

                {/* Input with Indian Flag & +91 Prefix */}
                <View style={styles.inputContainer}>
                  <Input
                    label="Mobile Number"
                    prefix="+91"
                    placeholder="Enter 10-digit number"
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={phoneNumber}
                    onChangeText={handlePhoneChange}
                    error={error || undefined}
                    helperText="Supports both Real Twilio SMS & Demo OTP"
                    leftIcon={
                      <View style={styles.flagIconContainer}>
                        <Text style={styles.flagEmoji}>🇮🇳</Text>
                      </View>
                    }
                    onClear={() => setPhoneNumber('')}
                  />
                </View>

                {/* Dual Action Buttons: Real Twilio SMS + Demo OTP */}
                <Button
                  title="Send Real Twilio SMS"
                  variant="primary"
                  loading={isLoading && activeMode === 'twilio'}
                  onPress={() => handleSendOtp('twilio')}
                  style={styles.continueButton}
                  icon={<Ionicons name="paper-plane" size={17} color={colors.accent} />}
                  iconPosition="right"
                />

                <TouchableOpacity
                  style={styles.demoOtpBtn}
                  onPress={() => handleSendOtp('demo')}
                  activeOpacity={0.85}
                  disabled={isLoading}
                >
                  <Ionicons name="flash" size={16} color="#059669" />
                  <Text style={styles.demoOtpBtnText}>Use Demo OTP (Instant Code: 123456)</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.titleSection}>
                  <Text style={styles.headline}>Enter Verification Code</Text>
                  <Text style={styles.subheadline}>
                    {activeMode === 'twilio'
                      ? `Code sent via Twilio SMS to +91 ${phoneNumber}`
                      : `Demo code generated for +91 ${phoneNumber}`}
                  </Text>
                </View>

                {/* Demo autofill helper banner */}
                <TouchableOpacity
                  style={styles.demoHelperPill}
                  onPress={() => {
                    setOtpCode('123456');
                    if (error) setError(null);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="sparkles" size={14} color="#0284C7" />
                  <Text style={styles.demoHelperText}>
                    Demo Test Code: <Text style={{ fontWeight: 'bold' }}>123456</Text> (Tap to auto-fill)
                  </Text>
                </TouchableOpacity>

                <View style={styles.inputContainer}>
                  <Input
                    label="6-Digit Code"
                    placeholder="Enter 6-digit OTP"
                    keyboardType="number-pad"
                    maxLength={6}
                    value={otpCode}
                    onChangeText={handleOtpChange}
                    error={error || undefined}
                    onClear={() => setOtpCode('')}
                  />
                </View>

                <Button
                  title="Verify & Continue"
                  variant="primary"
                  loading={isLoading}
                  onPress={handleVerifyOtp}
                  style={styles.continueButton}
                  icon={<Ionicons name="checkmark-circle" size={18} color={colors.accent} />}
                  iconPosition="right"
                />

                <View style={styles.resendRow}>
                  <TouchableOpacity onPress={() => { setStep('phone'); setOtpCode(''); setError(null); }}>
                    <Text style={styles.resendLink}>Change Number</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleSendOtp('twilio')}>
                    <Text style={styles.resendLink}>Resend Twilio SMS</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleSendOtp('demo')}>
                    <Text style={[styles.resendLink, { color: '#059669' }]}>Use Demo Code</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Quick Explore Divider */}
            <View style={styles.demoDivider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR EXPLORE DIRECTLY</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleQuickExplore}
              style={styles.demoButton}
            >
              <View style={styles.demoIconBadge}>
                <Ionicons name="flash" size={16} color={colors.accentText} />
              </View>
              <View style={styles.demoButtonTextWrapper}>
                <Text style={styles.demoButtonTitle}>Instant Access</Text>
                <Text style={styles.demoButtonSubtitle}>Explore without waiting for SMS</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Footer Terms & Legal */}
          <View style={styles.legalFooter}>
            <Text style={styles.legalText}>
              By proceeding, you agree to NEXORA RIDE&apos;s{' '}
              <Text
                style={styles.legalLink}
                onPress={() => showPolicyAlert('Terms of Service', 'Terms of Service')}
              >
                Terms of Service
              </Text>{' '}
              and{' '}
              <Text
                style={styles.legalLink}
                onPress={() => showPolicyAlert('Privacy Policy', 'Privacy Policy')}
              >
                Privacy Policy
              </Text>
              .
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  header: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.xs,
  },
  mainCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xxl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
  },
  titleSection: {
    marginBottom: spacing.lg,
  },
  headline: {
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.heavy,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subheadline: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  flagIconContainer: {
    paddingRight: spacing.xs,
  },
  flagEmoji: {
    fontSize: 18,
  },
  continueButton: {
    marginTop: spacing.xs,
  },
  demoOtpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingVertical: 12,
    borderRadius: borderRadius.pill,
    marginTop: spacing.sm,
  },
  demoOtpBtnText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: '#059669',
  },
  demoHelperPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  demoHelperText: {
    fontSize: 11,
    color: '#0284C7',
    fontWeight: typography.fontWeights.medium,
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  resendLink: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: '#0284C7',
  },
  demoDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    letterSpacing: 0.8,
    color: colors.textTertiary,
    paddingHorizontal: spacing.md,
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  demoIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  demoButtonTextWrapper: {
    flex: 1,
  },
  demoButtonTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  demoButtonSubtitle: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  legalFooter: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
  },
  legalText: {
    fontSize: 11,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 16,
  },
  legalLink: {
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
});

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TextInput,
  NativeSyntheticEvent,
} from 'react-native';

type TextInputKeyPressEventData = { key: string };
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '@/theme/tokens';
import { BrandLogo } from '@/components/common/BrandLogo';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { validateIndianMobileNumber } from '@/utils/validation';
import { authService } from '@/services/authService';
import { triggerHaptic } from '@/utils/haptics';

const OTP_LENGTH = 6;
const RESEND_TIMEOUT = 45;

export default function WelcomeScreen() {
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [activeMode, setActiveMode] = useState<'twilio' | 'demo'>('twilio');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const otpRefs = useRef<Array<any>>(Array(OTP_LENGTH).fill(null));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Derived: joined OTP string
  const otpCode = otpDigits.join('');

  // Start resend countdown
  const startResendTimer = useCallback(() => {
    setResendTimer(RESEND_TIMEOUT);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatTimer = (secs: number): string => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handlePhoneChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 10);
    setPhoneNumber(cleaned);
    if (error) setError(null);
  };

  // OTP digit handlers
  const handleOtpChange = (text: string, index: number) => {
    const cleaned = text.replace(/\D/g, '');

    // Handle paste: if user pastes 6 digits into any box
    if (cleaned.length >= OTP_LENGTH) {
      const digits = cleaned.slice(0, OTP_LENGTH).split('');
      setOtpDigits(digits);
      otpRefs.current[OTP_LENGTH - 1]?.focus();
      if (error) setError(null);
      return;
    }

    const digit = cleaned.slice(-1); // take last char
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);
    if (error) setError(null);

    // Auto-advance
    if (digit && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number
  ) => {
    if (e.nativeEvent.key === 'Backspace' && !otpDigits[index] && index > 0) {
      const newDigits = [...otpDigits];
      newDigits[index - 1] = '';
      setOtpDigits(newDigits);
      otpRefs.current[index - 1]?.focus();
    }
  };

  const fillDemoOtp = () => {
    setOtpDigits('123456'.split(''));
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
      startResendTimer();
      if (mode === 'demo') {
        setOtpDigits('123456'.split(''));
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
          {/* Welcome illustration above card */}
          <View style={styles.illustrationArea}>
            <View style={styles.illusCircleNavy} />
            <View style={styles.illusCircleLime} />
            <View style={styles.illusCarIcon}>
              <MaterialCommunityIcons name="car" size={28} color={colors.accentText} />
            </View>
          </View>

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

                {/* Phone input with country selector pill */}
                <View style={styles.phoneInputRow}>
                  <View style={styles.countryPill}>
                    <Text style={styles.flagEmoji}>🇮🇳</Text>
                    <Text style={styles.countryCode}>+91</Text>
                    <Ionicons name="chevron-down" size={12} color={colors.textSecondary} />
                  </View>
                  <View style={styles.phoneInputWrap}>
                    <Input
                      label=""
                      placeholder="10-digit number"
                      keyboardType="phone-pad"
                      maxLength={10}
                      value={phoneNumber}
                      onChangeText={handlePhoneChange}
                      error={error || undefined}
                      helperText="Supports both Real Twilio SMS & Demo OTP"
                      onClear={() => setPhoneNumber('')}
                    />
                  </View>
                </View>

                {/* Send SMS */}
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

                {/* Demo autofill banner */}
                <TouchableOpacity
                  style={styles.demoHelperPill}
                  onPress={fillDemoOtp}
                  activeOpacity={0.8}
                >
                  <Ionicons name="sparkles" size={14} color="#0284C7" />
                  <Text style={styles.demoHelperText}>
                    Demo Test Code: <Text style={{ fontWeight: 'bold' }}>123456</Text> (Tap to auto-fill)
                  </Text>
                </TouchableOpacity>

                {/* 6-box OTP input */}
                <View style={styles.otpRow}>
                  {otpDigits.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={(ref) => {
                        otpRefs.current[index] = ref;
                      }}
                      style={[
                        styles.otpBox,
                        digit ? styles.otpBoxFilled : null,
                        error ? styles.otpBoxError : null,
                      ]}
                      value={digit}
                      onChangeText={(text) => handleOtpChange(text, index)}
                      onKeyPress={(e) => handleOtpKeyPress(e, index)}
                      keyboardType="number-pad"
                      maxLength={6} // allow 6 for paste
                      textAlign="center"
                      selectTextOnFocus
                      caretHidden
                    />
                  ))}
                </View>

                {error ? <Text style={styles.otpError}>{error}</Text> : null}

                <Button
                  title="Verify & Continue"
                  variant="primary"
                  loading={isLoading}
                  onPress={handleVerifyOtp}
                  style={styles.continueButton}
                  icon={<Ionicons name="checkmark-circle" size={18} color={colors.accent} />}
                  iconPosition="right"
                />

                {/* Resend timer / button */}
                <View style={styles.resendRow}>
                  <TouchableOpacity onPress={() => { setStep('phone'); setOtpDigits(Array(OTP_LENGTH).fill('')); setError(null); }}>
                    <Text style={styles.resendLink}>Change Number</Text>
                  </TouchableOpacity>

                  {resendTimer > 0 ? (
                    <Text style={styles.resendTimer}>Resend in {formatTimer(resendTimer)}</Text>
                  ) : (
                    <TouchableOpacity onPress={() => handleSendOtp('twilio')}>
                      <Text style={[styles.resendLink, { color: '#0284C7' }]}>Resend OTP</Text>
                    </TouchableOpacity>
                  )}

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

  // Welcome illustration
  illustrationArea: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    position: 'relative',
  },
  illusCircleNavy: {
    position: 'absolute',
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primary,
    left: '50%',
    marginLeft: -44,
  },
  illusCircleLime: {
    position: 'absolute',
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.accent,
    left: '50%',
    marginLeft: -24,
    opacity: 0.9,
  },
  illusCarIcon: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
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

  // Phone input with country pill
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  countryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 12,
    marginTop: 2, // aligns with Input label offset
  },
  flagEmoji: {
    fontSize: 16,
  },
  countryCode: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  phoneInputWrap: {
    flex: 1,
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

  // OTP boxes
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: 6,
  },
  otpBox: {
    width: 44,
    height: 52,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.heavy,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    textAlign: 'center',
  },
  otpBoxFilled: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  otpBoxError: {
    borderColor: colors.error,
  },
  otpError: {
    color: colors.error,
    fontSize: typography.fontSizes.xs,
    marginBottom: spacing.sm,
    textAlign: 'center',
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
    flexWrap: 'wrap',
    gap: 4,
  },
  resendLink: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: '#0284C7',
  },
  resendTimer: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textTertiary,
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

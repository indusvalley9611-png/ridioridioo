/**
 * NEXORA RIDE — Welcome & Authentication Screen
 *
 * Implements exact requested format:
 * 1. Top user avatar icon in circle
 * 2. Heading: "One last thing" / "Welcome to NEXORA"
 * 3. 1. Your name ("Full name")
 * 4. 2. Your country ("Country *" with flag & selector) & City ("Your city *" with picker)
 * 5. 3. Mobile number * (with country code + phone input)
 * 6. 4. Invite code (optional) ("If a friend invited you")
 * 7. Action: "Save and continue" CTA button
 * 8. Privacy reassurance note: "Your number is shared only with the other person on a confirmed booking."
 * 9. Sub-action: "Explore without sign in instead"
 * 10. OTP verification step with 6 auto-advancing digit boxes, resend timer, demo 123456 autofill, and Twilio support.
 */

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
  Modal,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '@/theme/tokens';
import { validateIndianMobileNumber } from '@/utils/validation';
import { authService } from '@/services/authService';
import { kycService } from '@/services/kycService';
import { triggerHaptic } from '@/utils/haptics';

type TextInputKeyPressEventData = { key: string };

const OTP_LENGTH = 6;
const RESEND_TIMEOUT = 45;

interface CountryOption {
  name: string;
  code: string;
  flag: string;
  phoneCode: string;
}

const COUNTRIES: CountryOption[] = [
  { name: 'India', code: 'IN', flag: '🇮🇳', phoneCode: '+91' },
  { name: 'United Arab Emirates', code: 'AE', flag: '🇦🇪', phoneCode: '+971' },
  { name: 'United States', code: 'US', flag: '🇺🇸', phoneCode: '+1' },
  { name: 'United Kingdom', code: 'GB', flag: '🇬🇧', phoneCode: '+44' },
  { name: 'Singapore', code: 'SG', flag: '🇸🇬', phoneCode: '+65' },
  { name: 'Canada', code: 'CA', flag: '🇨🇦', phoneCode: '+1' },
  { name: 'Germany', code: 'DE', flag: '🇩🇪', phoneCode: '+49' },
  { name: 'Australia', code: 'AU', flag: '🇦🇺', phoneCode: '+61' },
  { name: 'Saudi Arabia', code: 'SA', flag: '🇸🇦', phoneCode: '+966' },
  { name: 'Qatar', code: 'QA', flag: '🇶🇦', phoneCode: '+974' },
];

const POPULAR_CITIES = [
  'Bengaluru (Bangalore)',
  'Mumbai',
  'Delhi NCR',
  'Hyderabad',
  'Chennai',
  'Pune',
  'Ahmedabad',
  'Kolkata',
  'Jaipur',
  'Chandigarh',
  'Coimbatore',
  'Kochi',
  'Mysuru',
  'Goa',
];

export default function WelcomeScreen() {
  const router = useRouter();

  // Screen step: 'details' (Name, Country, Phone, Invite) -> 'otp'
  const [step, setStep] = useState<'details' | 'otp'>('details');

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryOption>(COUNTRIES[0]);
  const [selectedCity, setSelectedCity] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  // Modals for country and city picker
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState('');
  const [citySearchQuery, setCitySearchQuery] = useState('');

  // OTP State
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [activeMode, setActiveMode] = useState<'twilio' | 'demo'>('twilio');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const otpRefs = useRef<Array<any>>(Array(OTP_LENGTH).fill(null));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const otpCode = otpDigits.join('');

  // Resend Timer
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

  // OTP digit handling
  const handleOtpChange = (text: string, index: number) => {
    const cleaned = text.replace(/\D/g, '');

    if (cleaned.length >= OTP_LENGTH) {
      const digits = cleaned.slice(0, OTP_LENGTH).split('');
      setOtpDigits(digits);
      otpRefs.current[OTP_LENGTH - 1]?.focus?.();
      if (error) setError(null);
      return;
    }

    const digit = cleaned.slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);
    if (error) setError(null);

    if (digit && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus?.();
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
      otpRefs.current[index - 1]?.focus?.();
    }
  };

  const fillDemoOtp = () => {
    setOtpDigits('123456'.split(''));
    if (error) setError(null);
  };

  // Submit Details -> Send OTP
  const handleSaveAndContinue = async (mode: 'twilio' | 'demo' = 'twilio') => {
    if (!fullName.trim() || fullName.trim().length < 2) {
      setError('Please enter your full name (at least 2 characters)');
      triggerHaptic.error();
      return;
    }

    if (!selectedCountry) {
      setError('Please select your country');
      triggerHaptic.error();
      return;
    }

    const phoneValidation = validateIndianMobileNumber(phoneNumber);
    if (!phoneValidation.isValid) {
      setError(phoneValidation.error || 'Please enter a valid 10-digit mobile number');
      triggerHaptic.error();
      return;
    }

    setError(null);
    setIsLoading(true);
    setActiveMode(mode);
    triggerHaptic.impactLight();

    // Pre-save user details into KYC / personal profile service
    try {
      await kycService.saveUserProfile({
        fullName: fullName.trim(),
        phone: `${selectedCountry.phoneCode} ${phoneNumber.trim()}`,
      });
    } catch {
      // Non-blocking
    }

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
        'Verification SMS Notice',
        res.message,
        [
          {
            text: 'Use Demo OTP (123456)',
            style: 'default',
            onPress: () => handleSaveAndContinue('demo'),
          },
          { text: 'Close', style: 'cancel' },
        ]
      );
    }
  };

  // Verify OTP
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
      // Ensure user profile has correct name
      try {
        await kycService.saveUserProfile({
          fullName: fullName.trim() || 'NEXORA Member',
          phone: `${selectedCountry.phoneCode} ${phoneNumber.trim()}`,
        });
      } catch {
        // Non-blocking
      }
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

  // Filtered Country & City Lists
  const filteredCountries = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(countrySearchQuery.toLowerCase()) ||
      c.phoneCode.includes(countrySearchQuery)
  );

  const filteredCities = POPULAR_CITIES.filter((city) =>
    city.toLowerCase().includes(citySearchQuery.toLowerCase())
  );

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
          {/* ─── Top Avatar Icon (Exact Reference Format) ─── */}
          <View style={styles.avatarHeaderArea}>
            <View style={styles.avatarCircleOuter}>
              <View style={styles.avatarCircleInner}>
                <Ionicons name="person-outline" size={32} color="#10B981" />
              </View>
            </View>
          </View>

          {/* ─── Main Card ─── */}
          <View style={styles.mainCard}>
            {step === 'details' ? (
              <>
                {/* Title */}
                <View style={styles.titleSection}>
                  <Text style={styles.headline}>One last thing</Text>
                  <Text style={styles.subheadline}>
                    Complete your profile to find and book carpool rides with trusted commuters.
                  </Text>
                </View>

                {error ? (
                  <View style={styles.errorBanner}>
                    <Ionicons name="alert-circle" size={16} color={colors.error} />
                    <Text style={styles.errorBannerText}>{error}</Text>
                  </View>
                ) : null}

                {/* 1. Your Name */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Your name *</Text>
                  <View style={styles.textInputBox}>
                    <Ionicons name="person" size={18} color="#94A3B8" style={styles.fieldIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Full name"
                      placeholderTextColor="#94A3B8"
                      value={fullName}
                      onChangeText={(text) => {
                        setFullName(text);
                        if (error) setError(null);
                      }}
                      autoCapitalize="words"
                      returnKeyType="next"
                    />
                  </View>
                </View>

                {/* 2. Country & City */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Your country *</Text>
                  <TouchableOpacity
                    style={styles.selectBox}
                    onPress={() => {
                      triggerHaptic.selection();
                      setIsCountryModalOpen(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.selectLeft}>
                      <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
                      <Text style={styles.selectValueText}>
                        {selectedCountry.name} ({selectedCountry.phoneCode})
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                </View>

                {/* City Picker */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Your city *</Text>
                  <TouchableOpacity
                    style={styles.selectBox}
                    onPress={() => {
                      triggerHaptic.selection();
                      setIsCityModalOpen(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.selectLeft}>
                      <Ionicons name="location-outline" size={18} color="#94A3B8" style={{ marginRight: 6 }} />
                      <Text
                        style={[
                          styles.selectValueText,
                          !selectedCity ? styles.placeholderText : null,
                        ]}
                      >
                        {selectedCity || 'Choose your city'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                </View>

                {/* 3. Mobile Number */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Mobile number *</Text>
                  <View style={styles.phoneInputRow}>
                    <TouchableOpacity
                      style={styles.phonePrefixPill}
                      onPress={() => setIsCountryModalOpen(true)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.prefixFlag}>{selectedCountry.flag}</Text>
                      <Text style={styles.prefixCode}>{selectedCountry.phoneCode}</Text>
                      <Ionicons name="chevron-down" size={12} color="#64748B" />
                    </TouchableOpacity>
                    <View style={styles.phoneNumberBox}>
                      <TextInput
                        style={styles.phoneTextInput}
                        placeholder="98765 43210"
                        placeholderTextColor="#94A3B8"
                        keyboardType="phone-pad"
                        maxLength={10}
                        value={phoneNumber}
                        onChangeText={handlePhoneChange}
                        returnKeyType="done"
                      />
                    </View>
                  </View>
                </View>

                {/* 4. Invite Code (Optional) */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Invite code (optional)</Text>
                  <View style={styles.textInputBox}>
                    <Ionicons name="gift-outline" size={18} color="#94A3B8" style={styles.fieldIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="If a friend invited you"
                      placeholderTextColor="#94A3B8"
                      value={inviteCode}
                      onChangeText={setInviteCode}
                      autoCapitalize="characters"
                    />
                  </View>
                </View>

                {/* Save and Continue Button */}
                <TouchableOpacity
                  style={[styles.saveBtn, isLoading && styles.btnDisabled]}
                  onPress={() => handleSaveAndContinue('twilio')}
                  disabled={isLoading}
                  activeOpacity={0.88}
                >
                  <Text style={styles.saveBtnText}>
                    {isLoading ? 'Sending verification...' : 'Save and continue'}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color="#0A2500" />
                </TouchableOpacity>

                {/* Instant Demo OTP option */}
                <TouchableOpacity
                  style={styles.demoQuickBtn}
                  onPress={() => handleSaveAndContinue('demo')}
                  activeOpacity={0.8}
                  disabled={isLoading}
                >
                  <Ionicons name="flash" size={15} color="#10B981" />
                  <Text style={styles.demoQuickBtnText}>
                    Instant Demo Mode (Code: 123456)
                  </Text>
                </TouchableOpacity>

                {/* Privacy Reassurance Note (Exact Reference) */}
                <Text style={styles.privacyNote}>
                  Your number is shared only with the other person on a confirmed booking.
                </Text>

                {/* Sign Out / Explore Instead (Exact Reference) */}
                <TouchableOpacity
                  style={styles.signOutLink}
                  onPress={handleQuickExplore}
                  activeOpacity={0.7}
                >
                  <Text style={styles.signOutLinkText}>Explore without sign in instead</Text>
                </TouchableOpacity>
              </>
            ) : (
              /* ─── Step 2: OTP Verification Screen ─── */
              <>
                <View style={styles.titleSection}>
                  <Text style={styles.headline}>Enter verification code</Text>
                  <Text style={styles.subheadline}>
                    {activeMode === 'twilio'
                      ? `Code sent via SMS to ${selectedCountry.phoneCode} ${phoneNumber}`
                      : `Demo code generated for ${selectedCountry.phoneCode} ${phoneNumber}`}
                  </Text>
                </View>

                {/* Demo autofill badge */}
                <TouchableOpacity
                  style={styles.demoHelperPill}
                  onPress={fillDemoOtp}
                  activeOpacity={0.8}
                >
                  <Ionicons name="sparkles" size={15} color="#0284C7" />
                  <Text style={styles.demoHelperText}>
                    Demo Test Code: <Text style={{ fontWeight: 'bold' }}>123456</Text> (Tap to auto-fill)
                  </Text>
                </TouchableOpacity>

                {/* 6-box OTP row */}
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
                      maxLength={6}
                      textAlign="center"
                      selectTextOnFocus
                      caretHidden
                    />
                  ))}
                </View>

                {error ? <Text style={styles.otpError}>{error}</Text> : null}

                {/* Verify Button */}
                <TouchableOpacity
                  style={[styles.saveBtn, isLoading && styles.btnDisabled]}
                  onPress={handleVerifyOtp}
                  disabled={isLoading}
                  activeOpacity={0.88}
                >
                  <Text style={styles.saveBtnText}>
                    {isLoading ? 'Verifying...' : 'Verify & Continue'}
                  </Text>
                  <Ionicons name="checkmark-circle" size={18} color="#0A2500" />
                </TouchableOpacity>

                {/* Resend row */}
                <View style={styles.resendRow}>
                  <TouchableOpacity
                    onPress={() => {
                      setStep('details');
                      setOtpDigits(Array(OTP_LENGTH).fill(''));
                      setError(null);
                    }}
                  >
                    <Text style={styles.resendLink}>← Edit details</Text>
                  </TouchableOpacity>

                  {resendTimer > 0 ? (
                    <Text style={styles.resendTimer}>Resend in {formatTimer(resendTimer)}</Text>
                  ) : (
                    <TouchableOpacity onPress={() => handleSaveAndContinue('twilio')}>
                      <Text style={[styles.resendLink, { color: '#0284C7' }]}>Resend OTP</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity onPress={() => handleSaveAndContinue('demo')}>
                    <Text style={[styles.resendLink, { color: '#10B981' }]}>Use Demo Code</Text>
                  </TouchableOpacity>
                </View>

                {/* Direct Explore Link */}
                <TouchableOpacity
                  style={[styles.signOutLink, { marginTop: 24 }]}
                  onPress={handleQuickExplore}
                  activeOpacity={0.7}
                >
                  <Text style={styles.signOutLinkText}>Skip & Explore Directly →</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <View style={{ height: 30 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ─── Country Selection Modal ─── */}
      <Modal
        visible={isCountryModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsCountryModalOpen(false)}
      >
        <SafeAreaView style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country</Text>
              <TouchableOpacity
                onPress={() => setIsCountryModalOpen(false)}
                hitSlop={10}
              >
                <Ionicons name="close" size={24} color="#0F172A" />
              </TouchableOpacity>
            </View>

            {/* Country search input */}
            <View style={styles.modalSearchBox}>
              <Ionicons name="search" size={18} color="#94A3B8" />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search country or code..."
                placeholderTextColor="#94A3B8"
                value={countrySearchQuery}
                onChangeText={setCountrySearchQuery}
                clearButtonMode="while-editing"
              />
            </View>

            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.code}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalListItem,
                    selectedCountry.code === item.code && styles.modalListItemActive,
                  ]}
                  onPress={() => {
                    triggerHaptic.selection();
                    setSelectedCountry(item);
                    setIsCountryModalOpen(false);
                    setCountrySearchQuery('');
                  }}
                >
                  <Text style={styles.modalFlag}>{item.flag}</Text>
                  <Text style={styles.modalItemTitle}>{item.name}</Text>
                  <Text style={styles.modalPhoneCode}>{item.phoneCode}</Text>
                  {selectedCountry.code === item.code && (
                    <Ionicons name="checkmark" size={20} color="#10B981" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </SafeAreaView>
      </Modal>

      {/* ─── City Selection Modal ─── */}
      <Modal
        visible={isCityModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsCityModalOpen(false)}
      >
        <SafeAreaView style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose your city</Text>
              <TouchableOpacity
                onPress={() => setIsCityModalOpen(false)}
                hitSlop={10}
              >
                <Ionicons name="close" size={24} color="#0F172A" />
              </TouchableOpacity>
            </View>

            {/* City search input */}
            <View style={styles.modalSearchBox}>
              <Ionicons name="search" size={18} color="#94A3B8" />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search your city..."
                placeholderTextColor="#94A3B8"
                value={citySearchQuery}
                onChangeText={setCitySearchQuery}
                clearButtonMode="while-editing"
              />
            </View>

            <FlatList
              data={filteredCities}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalListItem,
                    selectedCity === item && styles.modalListItemActive,
                  ]}
                  onPress={() => {
                    triggerHaptic.selection();
                    setSelectedCity(item);
                    setIsCityModalOpen(false);
                    setCitySearchQuery('');
                  }}
                >
                  <Ionicons name="location" size={18} color="#10B981" style={{ marginRight: 10 }} />
                  <Text style={styles.modalItemTitle}>{item}</Text>
                  {selectedCity === item && (
                    <Ionicons name="checkmark" size={20} color="#10B981" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A', // Sleek midnight background for top avatar
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 24,
  },

  // Avatar Header Area (Exact Reference)
  avatarHeaderArea: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarCircleOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircleInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Main Card
  mainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 24,
    ...shadows.lg,
  },
  titleSection: {
    marginBottom: 20,
    alignItems: 'center',
  },
  headline: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  subheadline: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    textAlign: 'center',
  },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorBannerText: {
    fontSize: 12,
    color: colors.error,
    fontWeight: '600',
    flex: 1,
  },

  // Field Groups
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  textInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  fieldIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#0F172A',
    padding: 0,
  },

  // Select Box (Dropdown style)
  selectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
  },
  selectLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  countryFlag: {
    fontSize: 18,
    marginRight: 8,
  },
  selectValueText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  placeholderText: {
    color: '#94A3B8',
    fontWeight: '400',
  },

  // Phone Input Row
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  phonePrefixPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 48,
  },
  prefixFlag: {
    fontSize: 16,
  },
  prefixCode: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  phoneNumberBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    justifyContent: 'center',
  },
  phoneTextInput: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    padding: 0,
    letterSpacing: 0.5,
  },

  // Save & Continue Button
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent, // Electric lime brand accent
    height: 52,
    borderRadius: borderRadius.pill,
    marginTop: 8,
    marginBottom: 10,
    ...shadows.glowLime,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.accentText,
  },
  btnDisabled: {
    opacity: 0.6,
  },

  demoQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingVertical: 10,
    borderRadius: borderRadius.pill,
    marginBottom: 16,
  },
  demoQuickBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },

  // Privacy note (Exact reference text)
  privacyNote: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 4,
    marginBottom: 14,
    paddingHorizontal: 8,
  },

  // Sign out / Skip link
  signOutLink: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  signOutLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },

  // OTP Screen Styles
  demoHelperPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 16,
    alignSelf: 'center',
  },
  demoHelperText: {
    fontSize: 12,
    color: '#0284C7',
    fontWeight: '500',
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  otpBox: {
    width: 44,
    height: 52,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
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
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingHorizontal: 4,
    flexWrap: 'wrap',
    gap: 8,
  },
  resendLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  resendTimer: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },

  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    marginVertical: 12,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    padding: 0,
  },
  modalListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  modalListItemActive: {
    backgroundColor: '#F0FDF4',
  },
  modalFlag: {
    fontSize: 22,
    marginRight: 12,
  },
  modalItemTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  modalPhoneCode: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginRight: 8,
  },
});

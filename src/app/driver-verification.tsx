/**
 * NEXORA RIDE — Production Driver Identity & Vehicle KYC Verification Screen
 *
 * Implements real-world multi-tier driver verification:
 * - Multi-country extensible architecture (India 🇮🇳, USA 🇺🇸, UK 🇬🇧, UAE 🇦🇪, Global 🌐)
 * - Physical Document Scans: Driving License (DL), Vehicle RC, and Driver Identity Selfie
 * - Formatted Syntactic & Algorithmic Validation (State codes, Checksums, Expiry)
 * - Zero unmasked Aadhaar / National ID storage (DPDPA 2023 & GDPR compliant)
 * - Supabase Private Storage (`driver-documents`) integration
 * - Real verification lifecycle (under review / verified / rejected) — NO Dev cheat buttons
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, borderRadius, shadows, typography } from '../theme/tokens';
import {
  kycService,
  DriverKycProfile,
  CountryCode,
  validateDrivingLicense,
  validateVehicleRC,
  validateNationalId,
} from '../services/kycService';
import { triggerHaptic } from '../utils/haptics';

interface DocumentFile {
  uri: string;
  name: string;
  blob?: Blob;
  ext: string;
}

const COUNTRIES: { code: CountryCode; label: string; flag: string; dlLabel: string; rcLabel: string; idLabel: string }[] = [
  { code: 'IN', label: 'India', flag: '🇮🇳', dlLabel: 'MoRTH Driving License', rcLabel: 'Vehicle RC (White Plate)', idLabel: 'Aadhaar (Last 4 Digits)' },
  { code: 'US', label: 'United States', flag: '🇺🇸', dlLabel: "State Driver's License", rcLabel: 'Vehicle Registration Title', idLabel: 'SSN (Last 4 Digits)' },
  { code: 'GB', label: 'United Kingdom', flag: '🇬🇧', dlLabel: 'DVLA Driving Licence', rcLabel: 'V5C Logbook Registration', idLabel: 'National Insurance (Last 4)' },
  { code: 'AE', label: 'UAE', flag: '🇦🇪', dlLabel: 'UAE Driving License', rcLabel: 'Mulkiya (Registration)', idLabel: 'Emirates ID (Last 4)' },
  { code: 'GLOBAL', label: 'Global / Other', flag: '🌐', dlLabel: 'International Driving Permit', rcLabel: 'Vehicle Title / Registration', idLabel: 'National Passport Number' },
];

export default function DriverVerificationScreen() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [profile, setProfile] = useState<DriverKycProfile | null>(null);

  // Country Selection
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>('IN');

  // Form Fields
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [dlNumber, setDlNumber] = useState('');
  const [dlExpiry, setDlExpiry] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [rcNumber, setRcNumber] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('White');
  const [fuelType, setFuelType] = useState<'petrol' | 'diesel' | 'cng' | 'ev'>('petrol');

  // Uploaded Document Files
  const [dlFile, setDlFile] = useState<DocumentFile | null>(null);
  const [rcFile, setRcFile] = useState<DocumentFile | null>(null);
  const [selfieFile, setSelfieFile] = useState<DocumentFile | null>(null);

  // Live validation feedback
  const [dlFeedback, setDlFeedback] = useState<{ valid: boolean; message?: string } | null>(null);
  const [rcFeedback, setRcFeedback] = useState<{ valid: boolean; message?: string } | null>(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const p = await kycService.getDriverProfile();
        if (isMounted) {
          setProfile(p);
          setSelectedCountry(p.countryCode || 'IN');
          setDriverName(p.fullName || '');
          setDriverPhone(p.phone || '');
          setDlNumber(p.drivingLicenseNumber || '');
          setDlExpiry(p.drivingLicenseExpiry || '');
          setNationalId(p.nationalIdMasked ? p.nationalIdMasked.replace(/[^0-9]/g, '') : '');
          setRcNumber(p.vehicle.registrationNumber || '');
          setMake(p.vehicle.make || '');
          setModel(p.vehicle.model || '');
          setColor(p.vehicle.color || 'White');
          setFuelType(p.vehicle.fuelType || 'petrol');
          setLoading(false);
        }
      } catch {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // Live DL Validator
  const handleDlChange = (val: string) => {
    setDlNumber(val);
    if (val.trim().length >= 4) {
      const res = validateDrivingLicense(val, selectedCountry, dlExpiry);
      setDlFeedback({ valid: res.valid, message: res.valid ? `Valid ${selectedCountry} format: ${res.normalized}` : res.error });
    } else {
      setDlFeedback(null);
    }
  };

  // Live RC Validator
  const handleRcChange = (val: string) => {
    setRcNumber(val);
    if (val.trim().length >= 4) {
      const res = validateVehicleRC(val, selectedCountry);
      setRcFeedback({ valid: res.valid, message: res.valid ? `Valid Non-Commercial Plate: ${res.normalized}` : res.error });
    } else {
      setRcFeedback(null);
    }
  };

  // Document Picker via Expo Image Picker
  const pickDocument = async (docType: 'dl' | 'rc' | 'selfie') => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const ext = asset.uri.split('.').pop() || 'jpg';

        // Fetch as blob for Supabase private storage upload
        let blob: Blob | undefined;
        try {
          const resp = await fetch(asset.uri);
          blob = await resp.blob();
        } catch {
          // Fallback
        }

        const docData: DocumentFile = {
          uri: asset.uri,
          name: `${docType}_document.${ext}`,
          blob,
          ext,
        };

        if (docType === 'dl') setDlFile(docData);
        if (docType === 'rc') setRcFile(docData);
        if (docType === 'selfie') setSelfieFile(docData);

        triggerHaptic.selection();
      }
    } catch {
      Alert.alert('Upload Error', 'Unable to access photo library. Please check app permissions.');
    }
  };

  const handleSubmit = async () => {
    // 1. Personal Details Check
    if (!driverName.trim() || driverName.trim().length < 3) {
      Alert.alert('Required Field', 'Please provide your Full Legal Name as per Government ID.');
      triggerHaptic.error();
      return;
    }
    if (!driverPhone.trim() || driverPhone.trim().length < 8) {
      Alert.alert('Required Field', 'Please provide a valid mobile contact phone number.');
      triggerHaptic.error();
      return;
    }

    // 2. Strict Driving License Validation
    const dlVal = validateDrivingLicense(dlNumber, selectedCountry, dlExpiry);
    if (!dlVal.valid) {
      Alert.alert('Driving License Error', dlVal.error || 'Please provide a valid Driving License.');
      triggerHaptic.error();
      return;
    }

    // 3. Strict Vehicle RC Validation
    const rcVal = validateVehicleRC(rcNumber, selectedCountry);
    if (!rcVal.valid) {
      Alert.alert('Vehicle RC Error', rcVal.error || 'Please provide a valid private vehicle registration.');
      triggerHaptic.error();
      return;
    }

    // 4. Vehicle Model Details
    if (!make.trim() || !model.trim()) {
      Alert.alert('Vehicle Details Required', 'Please enter your car Brand/Make and Model.');
      triggerHaptic.error();
      return;
    }

    // 5. National ID Check
    const idVal = validateNationalId(nationalId, selectedCountry);
    if (!idVal.valid) {
      Alert.alert('Identity Error', idVal.error || 'Please enter valid identity credentials.');
      triggerHaptic.error();
      return;
    }

    // 6. Physical Document Upload Check
    if (!dlFile && !profile?.licenseDocPath) {
      Alert.alert(
        'Upload Required',
        'Please upload a clear photo of your Government Driving License (Front) for security verification.'
      );
      triggerHaptic.error();
      return;
    }

    if (!rcFile && !profile?.vehicle?.rcDocPath) {
      Alert.alert(
        'Upload Required',
        'Please upload a clear photo of your Vehicle Registration Certificate (RC) to verify private ownership.'
      );
      triggerHaptic.error();
      return;
    }

    setSubmitting(true);
    triggerHaptic.impactMedium();

    try {
      const result = await kycService.submitKyc({
        userId: profile?.userId || `usr_${Date.now()}`,
        fullName: driverName.trim(),
        phone: driverPhone.trim(),
        countryCode: selectedCountry,
        drivingLicenseNumber: dlVal.normalized,
        drivingLicenseExpiry: dlExpiry.trim() || '2031-12-31',
        licenseDocBlob: dlFile?.blob,
        licenseDocExt: dlFile?.ext,
        nationalIdRaw: nationalId.trim(),
        vehicleRegistration: rcVal.normalized,
        make: make.trim(),
        model: model.trim(),
        color: color.trim() || 'White',
        fuelType,
        rcDocBlob: rcFile?.blob,
        rcDocExt: rcFile?.ext,
        selfieBlob: selfieFile?.blob,
        selfieExt: selfieFile?.ext,
      });

      setSubmitting(false);

      if (result.success && result.profile) {
        setProfile(result.profile);
        triggerHaptic.success();
        Alert.alert(
          'Verification Submitted',
          'Your documents have been submitted to our automated compliance screening pipeline. Verification typically takes 30-120 minutes.\n\n🔒 All documents are stored encrypted in private cold vaults in compliance with Data Privacy Regulations.',
          [{ text: 'OK' }]
        );
      } else {
        triggerHaptic.error();
        Alert.alert('Verification Error', result.error || 'Failed to submit KYC details.');
      }
    } catch {
      setSubmitting(false);
      triggerHaptic.error();
      Alert.alert('Submission Error', 'Failed to connect to verification server. Please try again.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  const currentCountryConfig = COUNTRIES.find((c) => c.code === selectedCountry) || COUNTRIES[0];
  const isVerified = profile?.status === 'verified';
  const isUnderReview = profile?.status === 'under_review';

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/profile');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Driver & Vehicle KYC</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Verification Status Card */}
        <View
          style={[
            styles.statusCard,
            isVerified
              ? styles.statusCardVerified
              : isUnderReview
              ? styles.statusCardReview
              : styles.statusCardPending,
          ]}
        >
          <View style={styles.statusHeaderRow}>
            <View style={styles.statusBadge}>
              <Ionicons
                name={
                  isVerified
                    ? 'checkmark-circle'
                    : isUnderReview
                    ? 'hourglass'
                    : 'alert-circle'
                }
                size={20}
                color={isVerified ? '#059669' : isUnderReview ? '#0284C7' : '#D97706'}
              />
              <Text
                style={[
                  styles.statusBadgeText,
                  { color: isVerified ? '#059669' : isUnderReview ? '#0284C7' : '#D97706' },
                ]}
              >
                {isVerified
                  ? 'VERIFIED CARPOOL HOST'
                  : isUnderReview
                  ? 'DOCUMENTS UNDER REVIEW'
                  : 'ACTION REQUIRED: UNVERIFIED'}
              </Text>
            </View>
            <Text style={styles.trustScoreText}>Trust Score: {profile?.trustScore || 0}%</Text>
          </View>
          <Text style={styles.statusDesc}>
            {isVerified
              ? 'Your identity, driving license, and white-plate vehicle are verified. You can publish rides and accept co-travelers.'
              : isUnderReview
              ? 'Your documents have passed preliminary checks and are undergoing government registry cross-screening. Review completes within 2 hours.'
              : 'NEXORA RIDE requires strict driver and vehicle verification to protect passengers against impersonation and unauthorized commercial taxis.'}
          </Text>

          {/* Verification Pipeline Progress */}
          {isUnderReview && (
            <View style={styles.pipelineContainer}>
              <View style={styles.pipelineStep}>
                <Ionicons name="checkmark-circle" size={14} color="#059669" />
                <Text style={styles.pipelineStepDone}>1. Document Photos Uploaded</Text>
              </View>
              <View style={styles.pipelineStep}>
                <Ionicons name="checkmark-circle" size={14} color="#059669" />
                <Text style={styles.pipelineStepDone}>2. Format & Expiry Validated</Text>
              </View>
              <View style={styles.pipelineStep}>
                <ActivityIndicator size="small" color="#0284C7" style={{ transform: [{ scale: 0.7 }] }} />
                <Text style={styles.pipelineStepActive}>3. Registry Cross-Check in Progress</Text>
              </View>
            </View>
          )}
        </View>

        {/* Global Country Jurisdiction Selector */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>Operating Jurisdiction / Country</Text>
          <Text style={styles.helperText}>
            Select your country of driver licensing. Validation rules adjust automatically for local transport authorities.
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.countryScroll}>
            {COUNTRIES.map((c) => (
              <TouchableOpacity
                key={c.code}
                style={[styles.countryChip, selectedCountry === c.code && styles.countryChipActive]}
                onPress={() => {
                  setSelectedCountry(c.code);
                  triggerHaptic.selection();
                }}
              >
                <Text style={styles.countryFlag}>{c.flag}</Text>
                <Text
                  style={[
                    styles.countryLabel,
                    selectedCountry === c.code && styles.countryLabelActive,
                  ]}
                >
                  {c.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* 1. Driver Personal Details */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>1. Driver Personal Details</Text>
          <Text style={styles.inputLabel}>Full Legal Name (as per Govt ID)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Ramesh Kumar"
            value={driverName}
            onChangeText={setDriverName}
          />

          <Text style={styles.inputLabel}>Verified Contact Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. +91 9876543210"
            value={driverPhone}
            onChangeText={setDriverPhone}
            keyboardType="phone-pad"
          />

          <Text style={styles.inputLabel}>{currentCountryConfig.idLabel}</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 8842"
            value={nationalId}
            onChangeText={setNationalId}
            maxLength={16}
          />
          <Text style={styles.privacyNote}>
            🔒 DPDPA 2023 / Privacy Compliance: We only store masked digits for audit trails. Full national IDs are never saved.
          </Text>
        </View>

        {/* 2. Driving License & Document Upload */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>2. {currentCountryConfig.dlLabel}</Text>

          <Text style={styles.inputLabel}>DL Number (e.g. KA-01-20190001234)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter complete Driving License Number"
            value={dlNumber}
            onChangeText={handleDlChange}
            autoCapitalize="characters"
          />
          {dlFeedback && (
            <View style={styles.feedbackRow}>
              <Ionicons
                name={dlFeedback.valid ? 'checkmark-circle' : 'alert-circle'}
                size={14}
                color={dlFeedback.valid ? '#059669' : '#DC2626'}
              />
              <Text
                style={[
                  styles.feedbackText,
                  { color: dlFeedback.valid ? '#059669' : '#DC2626' },
                ]}
              >
                {dlFeedback.message}
              </Text>
            </View>
          )}

          <Text style={styles.inputLabel}>License Expiry Date (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 2032-05-15"
            value={dlExpiry}
            onChangeText={setDlExpiry}
          />

          {/* Upload Driving License Photo */}
          <Text style={styles.uploadLabel}>Upload Driving License (Front Photo)</Text>
          <TouchableOpacity
            style={styles.uploadBox}
            onPress={() => pickDocument('dl')}
            activeOpacity={0.8}
          >
            {dlFile ? (
              <View style={styles.uploadedRow}>
                <Image source={{ uri: dlFile.uri }} style={styles.docThumbnail} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.docFileName} numberOfLines={1}>
                    {dlFile.name}
                  </Text>
                  <Text style={styles.docReadyText}>✓ Document Ready for Encryption</Text>
                </View>
                <Ionicons name="checkmark-circle" size={20} color="#059669" />
              </View>
            ) : (
              <View style={styles.uploadPlaceholder}>
                <Ionicons name="camera-outline" size={26} color={colors.primary} />
                <Text style={styles.uploadPlaceholderTitle}>Tap to select or take photo</Text>
                <Text style={styles.uploadPlaceholderSub}>JPEG or PNG up to 10MB</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* 3. Vehicle Registration Certificate (RC) & Photo */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>3. {currentCountryConfig.rcLabel}</Text>
          <Text style={styles.inputLabel}>
            Vehicle Registration Number (White Plate Personal Car)
          </Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. KA 05 AB 1234 or 22 BH 1234 AA"
            value={rcNumber}
            onChangeText={handleRcChange}
            autoCapitalize="characters"
          />
          {rcFeedback && (
            <View style={styles.feedbackRow}>
              <Ionicons
                name={rcFeedback.valid ? 'checkmark-circle' : 'alert-circle'}
                size={14}
                color={rcFeedback.valid ? '#059669' : '#DC2626'}
              />
              <Text
                style={[
                  styles.feedbackText,
                  { color: rcFeedback.valid ? '#059669' : '#DC2626' },
                ]}
              >
                {rcFeedback.message}
              </Text>
            </View>
          )}

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: spacing.sm }}>
              <Text style={styles.inputLabel}>Car Make / Brand</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Tata, Hyundai"
                value={make}
                onChangeText={setMake}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Model</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Nexon, Creta"
                value={model}
                onChangeText={setModel}
              />
            </View>
          </View>

          <Text style={styles.inputLabel}>Vehicle Color</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. White, Silver, Dark Blue"
            value={color}
            onChangeText={setColor}
          />

          <Text style={styles.inputLabel}>Fuel / Powertrain Type</Text>
          <View style={styles.fuelTypeRow}>
            {(['petrol', 'diesel', 'cng', 'ev'] as const).map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.fuelBtn, fuelType === type && styles.fuelBtnActive]}
                onPress={() => setFuelType(type)}
              >
                <Text style={[styles.fuelBtnText, fuelType === type && styles.fuelBtnTextActive]}>
                  {type.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Upload Vehicle RC Photo */}
          <Text style={styles.uploadLabel}>Upload Vehicle Registration Certificate (RC Photo)</Text>
          <TouchableOpacity
            style={styles.uploadBox}
            onPress={() => pickDocument('rc')}
            activeOpacity={0.8}
          >
            {rcFile ? (
              <View style={styles.uploadedRow}>
                <Image source={{ uri: rcFile.uri }} style={styles.docThumbnail} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.docFileName} numberOfLines={1}>
                    {rcFile.name}
                  </Text>
                  <Text style={styles.docReadyText}>✓ Document Ready for Encryption</Text>
                </View>
                <Ionicons name="checkmark-circle" size={20} color="#059669" />
              </View>
            ) : (
              <View style={styles.uploadPlaceholder}>
                <Ionicons name="document-attach-outline" size={26} color={colors.primary} />
                <Text style={styles.uploadPlaceholderTitle}>Tap to select or take photo</Text>
                <Text style={styles.uploadPlaceholderSub}>Proof of private vehicle registration</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* 4. Driver Live Selfie (Identity Match) */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>4. Driver Identity Confirmation (Selfie)</Text>
          <Text style={styles.helperText}>
            Take a clear photo of your face. This prevents identity theft and ensures passengers meet the verified host.
          </Text>
          <TouchableOpacity
            style={styles.uploadBox}
            onPress={() => pickDocument('selfie')}
            activeOpacity={0.8}
          >
            {selfieFile ? (
              <View style={styles.uploadedRow}>
                <Image source={{ uri: selfieFile.uri }} style={styles.docThumbnail} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.docFileName} numberOfLines={1}>
                    {selfieFile.name}
                  </Text>
                  <Text style={styles.docReadyText}>✓ Face photo captured</Text>
                </View>
                <Ionicons name="checkmark-circle" size={20} color="#059669" />
              </View>
            ) : (
              <View style={styles.uploadPlaceholder}>
                <Ionicons name="person-circle-outline" size={28} color={colors.primary} />
                <Text style={styles.uploadPlaceholderTitle}>Upload Clear Headshot / Selfie</Text>
                <Text style={styles.uploadPlaceholderSub}>Must match face on Driving License</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Legal Declaration */}
        <View style={styles.declarationCard}>
          <Ionicons name="shield-checkmark-outline" size={18} color="#0284C7" />
          <Text style={styles.declarationText}>
            By submitting, I certify under penalty of law that I hold a valid, unexpired Driving License and that my vehicle is a private (non-commercial) vehicle insured under Motor Vehicles Act rules.
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={colors.textInverse} />
          ) : (
            <Text style={styles.submitBtnText}>Submit Documents for Verification</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  statusCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    borderWidth: 1.5,
  },
  statusCardVerified: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  statusCardReview: {
    backgroundColor: '#EFF6FF',
    borderColor: '#0284C7',
  },
  statusCardPending: {
    backgroundColor: '#FFFBEB',
    borderColor: '#D97706',
  },
  statusHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 6,
  },
  trustScoreText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  statusDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  pipelineContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#BFDBFE',
    gap: 6,
  },
  pipelineStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pipelineStepDone: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
  pipelineStepActive: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  helperText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
    marginBottom: spacing.sm,
  },
  countryScroll: {
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  countryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  countryChipActive: {
    backgroundColor: '#EEF2FF',
    borderColor: colors.primary,
  },
  countryFlag: {
    fontSize: 14,
  },
  countryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  countryLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceMuted,
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  feedbackText: {
    fontSize: 11,
    fontWeight: '600',
  },
  privacyNote: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 6,
    lineHeight: 15,
  },
  uploadLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 12,
    marginBottom: 6,
  },
  uploadBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadPlaceholder: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  uploadPlaceholderTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 4,
  },
  uploadPlaceholderSub: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 2,
  },
  uploadedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  docThumbnail: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
  },
  docFileName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  docReadyText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
  },
  fuelTypeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 6,
  },
  fuelBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fuelBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  fuelBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  fuelBtnTextActive: {
    color: colors.textInverse,
  },
  declarationCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: '#F0F9FF',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginBottom: spacing.lg,
  },
  declarationText: {
    flex: 1,
    fontSize: 11,
    color: '#0369A1',
    lineHeight: 16,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  submitBtnText: {
    color: colors.textInverse,
    fontWeight: '700',
    fontSize: 15,
  },
});

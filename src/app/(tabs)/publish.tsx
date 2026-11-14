/**
 * NEXORA RIDE — BlaBlaCar "Publish a Ride" Screen
 *
 * Allows drivers to offer empty car seats to co-travelers,
 * set pricing, pick-up points, car details, and travel preferences.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '@/theme/tokens';
import { CarpoolService } from '@/services/carpoolService';

export default function PublishRideScreen() {
  const router = useRouter();

  // Form State
  const [originCity, setOriginCity] = useState('Bangalore');
  const [originSpot, setOriginSpot] = useState('Silk Board / Electronic City');
  const [destinationCity, setDestinationCity] = useState('Chennai');
  const [destinationSpot, setDestinationSpot] = useState('Koyambedu / Guindy');
  const [stopoversInput, setStopoversInput] = useState('Hosur, Krishnagiri (Coffee Stop), Vellore');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [departureTime, setDepartureTime] = useState('07:00 AM');
  const [seatsAvailable, setSeatsAvailable] = useState(3);
  const [pricePerSeat, setPricePerSeat] = useState('500');

  // Car Details
  const [carMake, setCarMake] = useState('Hyundai');
  const [carModel, setCarModel] = useState('Creta');
  const [carColor, setCarColor] = useState('White');

  // Amenities & Rules
  const [ac, setAc] = useState(true);
  const [maxTwoInBack, setMaxTwoInBack] = useState(true);
  const [instantBooking, setInstantBooking] = useState(true);
  const [luggageSize, setLuggageSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [smokingAllowed, setSmokingAllowed] = useState(false);
  const [petsAllowed, setPetsAllowed] = useState(false);
  const [notes, setNotes] = useState('Punctual departure. Friendly playlist and pleasant AC ride.');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePublish = async () => {
    if (!originCity.trim() || !destinationCity.trim()) {
      Alert.alert('Missing Location', 'Please provide both departure and arrival cities.');
      return;
    }

    const price = parseFloat(pricePerSeat);
    if (isNaN(price) || price < 50) {
      Alert.alert('Invalid Price', 'Please set a fair price per seat of at least ₹50.');
      return;
    }

    setIsSubmitting(true);
    try {
      const stopoversList = stopoversInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((city, idx) => ({
          city,
          spot: 'Highway Boarding Point',
          eta: `Stop ${idx + 1}`,
          isStopForRefreshment: city.toLowerCase().includes('coffee') || city.toLowerCase().includes('food'),
        }));

      const createdRide = await CarpoolService.publishRide({
        originCity: originCity.trim(),
        originSpot: originSpot.trim(),
        destinationCity: destinationCity.trim(),
        destinationSpot: destinationSpot.trim(),
        stopovers: stopoversList,
        date,
        departureTime,
        seatsAvailable,
        pricePerSeat: price,
        carMake: carMake.trim(),
        carModel: carModel.trim(),
        carColor: carColor.trim(),
        ac,
        maxTwoInBack,
        luggageSize,
        smokingAllowed,
        petsAllowed,
        instantBooking,
        notes: notes.trim(),
      });

      Alert.alert(
        '🎉 Ride Published!',
        `Your ride from ${createdRide.origin.city} to ${createdRide.destination.city} is now live and visible to co-passengers.`,
        [
          {
            text: 'View My Rides',
            onPress: () => router.push('/(tabs)/rides'),
          },
        ]
      );
    } catch {
      Alert.alert('Error', 'Unable to publish ride. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerSubtitle}>SHARE YOUR EMPTY SEATS</Text>
              <Text style={styles.headerTitle}>Publish a Ride</Text>
            </View>
            <View style={styles.iconCircle}>
              <Ionicons name="car-sport" size={24} color={colors.primary} />
            </View>
          </View>

          {/* Section 1: Route */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>1. Itinerary</Text>

            {/* Departure */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Departure City</Text>
              <View style={styles.inputRow}>
                <Ionicons name="radio-button-on" size={18} color="#0284C7" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={originCity}
                  onChangeText={setOriginCity}
                  placeholder="e.g. Bangalore"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Pickup Spot / Landmark</Text>
              <View style={styles.inputRow}>
                <Ionicons name="location-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={originSpot}
                  onChangeText={setOriginSpot}
                  placeholder="e.g. Silk Board Metro Station"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
            </View>

            {/* Destination */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Destination City</Text>
              <View style={styles.inputRow}>
                <Ionicons name="location" size={18} color={colors.primary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={destinationCity}
                  onChangeText={setDestinationCity}
                  placeholder="e.g. Chennai"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Drop-off Spot / Landmark</Text>
              <View style={styles.inputRow}>
                <Ionicons name="flag-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={destinationSpot}
                  onChangeText={setDestinationSpot}
                  placeholder="e.g. Koyambedu Bus Terminus"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Highway Stopovers (Comma-Separated)</Text>
              <View style={styles.inputRow}>
                <Ionicons name="git-commit-outline" size={18} color="#0284C7" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={stopoversInput}
                  onChangeText={setStopoversInput}
                  placeholder="e.g. Hosur, Krishnagiri, Vellore"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
              <Text style={styles.subtext}>
                Allow co-passengers to board or alight at intermediate towns along the route.
              </Text>
            </View>
          </View>

          {/* Section 2: Date, Time & Pricing */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>2. Schedule & Pricing</Text>

            <View style={styles.dualRow}>
              <View style={[styles.fieldGroup, { flex: 1, marginRight: spacing.sm }]}>
                <Text style={styles.label}>Departure Date</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={date}
                    onChangeText={setDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>
              </View>

              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.label}>Departure Time</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="time-outline" size={16} color={colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={departureTime}
                    onChangeText={setDepartureTime}
                    placeholder="e.g. 07:00 AM"
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>
              </View>
            </View>

            {/* Seats Count */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Available Empty Seats</Text>
              <View style={styles.seatSelectorRow}>
                {[1, 2, 3, 4].map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.seatBtn, seatsAvailable === s && styles.seatBtnActive]}
                    onPress={() => setSeatsAvailable(s)}
                  >
                    <Ionicons
                      name="person"
                      size={16}
                      color={seatsAvailable === s ? colors.primary : colors.textSecondary}
                    />
                    <Text
                      style={[styles.seatBtnText, seatsAvailable === s && styles.seatBtnTextActive]}
                    >
                      {s} {s === 1 ? 'Seat' : 'Seats'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Price Per Seat */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelWithHint}>
                <Text style={styles.label}>Price per Passenger Seat (₹)</Text>
                <Text style={styles.hintBadge}>Recommended: ₹350 - ₹550</Text>
              </View>
              <View style={styles.inputRow}>
                <Text style={styles.currencyPrefix}>₹</Text>
                <TextInput
                  style={[styles.input, styles.priceInput]}
                  value={pricePerSeat}
                  onChangeText={setPricePerSeat}
                  keyboardType="numeric"
                  placeholder="450"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
              <Text style={styles.subtext}>
                BlaBlaCar rules: Fair cost-sharing only. No commercial profit.
              </Text>

              {/* Dynamic Fuel Recovery Card */}
              <View style={styles.recoveryCard}>
                <Ionicons name="sparkles" size={16} color="#059669" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.recoveryTitle}>Estimated Fuel & Toll Recovery</Text>
                  <Text style={styles.recoveryAmount}>
                    Up to ₹{(parseFloat(pricePerSeat || '0') * seatsAvailable).toFixed(0)} total
                  </Text>
                </View>
                <Text style={styles.recoverySeatsNote}>{seatsAvailable} passengers</Text>
              </View>
            </View>
          </View>

          {/* Section 3: Car Details */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>3. Your Car</Text>

            <View style={styles.dualRow}>
              <View style={[styles.fieldGroup, { flex: 1, marginRight: spacing.sm }]}>
                <Text style={styles.label}>Car Brand / Make</Text>
                <TextInput
                  style={styles.inputSolo}
                  value={carMake}
                  onChangeText={setCarMake}
                  placeholder="e.g. Hyundai"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.label}>Car Model</Text>
                <TextInput
                  style={styles.inputSolo}
                  value={carModel}
                  onChangeText={setCarModel}
                  placeholder="e.g. Creta"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Color</Text>
              <TextInput
                style={styles.inputSolo}
                value={carColor}
                onChangeText={setCarColor}
                placeholder="e.g. White"
                placeholderTextColor={colors.textTertiary}
              />
            </View>
          </View>

          {/* Section 4: Travel Rules & Comfort */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>4. Comfort & Preferences</Text>

            <View style={styles.toggleRow}>
              <View style={styles.toggleMeta}>
                <Text style={styles.toggleTitle}>Air Conditioned (AC)</Text>
                <Text style={styles.toggleSub}>Keep car cool & comfortable</Text>
              </View>
              <Switch
                value={ac}
                onValueChange={setAc}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor={ac ? colors.primary : '#FFFFFF'}
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleMeta}>
                <Text style={styles.toggleTitle}>Max 2 in the Back</Text>
                <Text style={styles.toggleSub}>Guarantees middle seat remains empty</Text>
              </View>
              <Switch
                value={maxTwoInBack}
                onValueChange={setMaxTwoInBack}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor={maxTwoInBack ? colors.primary : '#FFFFFF'}
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleMeta}>
                <Text style={styles.toggleTitle}>Instant Booking</Text>
                <Text style={styles.toggleSub}>Co-travelers book without waiting for approval</Text>
              </View>
              <Switch
                value={instantBooking}
                onValueChange={setInstantBooking}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor={instantBooking ? colors.primary : '#FFFFFF'}
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleMeta}>
                <Text style={styles.toggleTitle}>Smoking Permitted</Text>
                <Text style={styles.toggleSub}>Allow smoke breaks during trip</Text>
              </View>
              <Switch
                value={smokingAllowed}
                onValueChange={setSmokingAllowed}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor={smokingAllowed ? colors.primary : '#FFFFFF'}
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleMeta}>
                <Text style={styles.toggleTitle}>Pets Welcome</Text>
                <Text style={styles.toggleSub}>Allow pets in carriers</Text>
              </View>
              <Switch
                value={petsAllowed}
                onValueChange={setPetsAllowed}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor={petsAllowed ? colors.primary : '#FFFFFF'}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Luggage Size Allowed</Text>
              <View style={styles.luggageRow}>
                {(['small', 'medium', 'large'] as const).map((size) => (
                  <TouchableOpacity
                    key={size}
                    style={[styles.luggageBtn, luggageSize === size && styles.luggageBtnActive]}
                    onPress={() => setLuggageSize(size)}
                  >
                    <Ionicons
                      name="briefcase-outline"
                      size={15}
                      color={luggageSize === size ? colors.primary : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.luggageBtnText,
                        luggageSize === size && styles.luggageBtnTextActive,
                      ]}
                    >
                      {size.charAt(0).toUpperCase() + size.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Note to co-passengers */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Note to Co-Travelers</Text>
              <TextInput
                style={[styles.inputSolo, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                placeholder="Mention coffee stops, playlists, or luggage specifics..."
                placeholderTextColor={colors.textTertiary}
              />
            </View>
          </View>

          {/* Publish CTA Button */}
          <TouchableOpacity
            style={[styles.publishBtn, isSubmitting && styles.publishBtnDisabled]}
            onPress={handlePublish}
            disabled={isSubmitting}
            activeOpacity={0.88}
          >
            <Ionicons name="checkmark-circle" size={20} color={colors.accentText} />
            <Text style={styles.publishBtnText}>
              {isSubmitting ? 'Publishing...' : 'Publish Your Ride'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.huge,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  headerSubtitle: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.heavy,
    letterSpacing: 1.2,
    color: '#0284C7',
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.heavy,
    color: colors.textPrimary,
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.heavy,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  fieldGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  labelWithHint: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hintBadge: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: '#059669',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.pill,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: typography.fontSizes.base,
    color: colors.textPrimary,
  },
  inputSolo: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.md,
    height: 48,
    fontSize: typography.fontSizes.base,
    color: colors.textPrimary,
  },
  dualRow: {
    flexDirection: 'row',
  },
  currencyPrefix: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
    marginRight: spacing.xs,
  },
  priceInput: {
    fontWeight: typography.fontWeights.bold,
    fontSize: typography.fontSizes.lg,
  },
  subtext: {
    fontSize: typography.fontSizes.xs,
    color: colors.textTertiary,
    marginTop: 4,
  },
  recoveryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.sm,
  },
  recoveryTitle: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: '#065F46',
  },
  recoveryAmount: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.heavy,
    color: '#059669',
    marginTop: 1,
  },
  recoverySeatsNote: {
    fontSize: 10,
    color: '#047857',
    fontWeight: typography.fontWeights.semibold,
  },
  seatSelectorRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  seatBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 44,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  seatBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.accentSoft,
  },
  seatBtnText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
  },
  seatBtnTextActive: {
    color: colors.primary,
    fontWeight: typography.fontWeights.bold,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceMuted,
  },
  toggleMeta: {
    flex: 1,
    paddingRight: spacing.md,
  },
  toggleTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  toggleSub: {
    fontSize: typography.fontSizes.xs,
    color: colors.textTertiary,
    marginTop: 2,
  },
  luggageRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  luggageBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 40,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  luggageBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.accentSoft,
  },
  luggageBtnText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
  },
  luggageBtnTextActive: {
    color: colors.primary,
    fontWeight: typography.fontWeights.bold,
  },
  textArea: {
    height: 80,
    paddingTop: spacing.sm,
    textAlignVertical: 'top',
  },
  publishBtn: {
    backgroundColor: colors.accent,
    height: 54,
    borderRadius: borderRadius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    ...shadows.md,
  },
  publishBtnDisabled: {
    opacity: 0.6,
  },
  publishBtnText: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.accentText,
  },
});

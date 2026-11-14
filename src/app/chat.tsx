/**
 * NEXORA RIDE — In-App Passenger-Driver Chat Screen
 *
 * Real-time carpooling coordination: meeting points, luggage queries,
 * coffee stops, and quick-tap message chips.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '@/theme/tokens';
import { CarpoolService } from '@/services/carpoolService';
import type { ChatMessage, CarpoolRide } from '@/models/carpool';
import { triggerHaptic } from '@/utils/haptics';

const QUICK_CHIPS = [
  '📍 Where should we meet at the toll?',
  '🎒 I have 1 backpack + laptop bag',
  '☕ Will we stop for coffee/restroom?',
  '⏰ I am 5 minutes away!',
];

export default function ChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ rideId?: string }>();
  const rideId = params.rideId || 'cpr-001';

  const [ride, setRide] = useState<CarpoolRide | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const rideData = await CarpoolService.getRideById(rideId);
      const chatHistory = await CarpoolService.getChatMessages(rideId);
      if (isMounted) {
        setRide(rideData);
        setMessages(chatHistory);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [rideId]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isSending) return;

    triggerHaptic.impactLight();
    setInputText('');
    setIsSending(true);

    try {
      const { userMessage, replyMessage } = await CarpoolService.sendMessage(rideId, text);
      setMessages((prev) => [...prev, userMessage]);

      if (replyMessage) {
        setTimeout(() => {
          setMessages((prev) => [...prev, replyMessage]);
          scrollRef.current?.scrollToEnd({ animated: true });
        }, 1200);
      }
    } finally {
      setIsSending(false);
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const handleCall = () => {
    Linking.openURL('tel:+919876543210').catch(() => {
      Alert.alert('Driver Phone', 'Call Vikram at +91 98765 43210');
    });
  };

  const driverName = ride?.driver.name || 'Driver';
  const carInfo = ride ? `${ride.car.make} ${ride.car.model} • ${ride.car.color}` : 'Car';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.driverHeaderCol}>
          <Text style={styles.driverNameText}>{driverName}</Text>
          <Text style={styles.carInfoText} numberOfLines={1}>
            {carInfo} {ride?.car.licensePlate ? `• ${ride.car.licensePlate}` : ''}
          </Text>
        </View>

        <TouchableOpacity style={styles.callBtn} onPress={handleCall} accessibilityLabel="Call driver">
          <Ionicons name="call" size={18} color="#059669" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Messages List */}
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {/* Safety Notice */}
          <View style={styles.safetyNotice}>
            <Ionicons name="lock-closed" size={14} color="#059669" />
            <Text style={styles.safetyNoticeText}>
              End-to-end encrypted carpool chat. Never share private bank OTPs.
            </Text>
          </View>

          {messages.map((msg) => {
            const isMe = msg.sender === 'passenger';
            return (
              <View
                key={msg.id}
                style={[
                  styles.messageBubble,
                  isMe ? styles.messageBubbleUser : styles.messageBubbleDriver,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    isMe ? styles.messageTextUser : styles.messageTextDriver,
                  ]}
                >
                  {msg.text}
                </Text>
                <View style={styles.messageFooter}>
                  <Text style={styles.timestampText}>{msg.timestamp}</Text>
                  {isMe && (
                    <Ionicons name="checkmark-done" size={13} color={colors.accentText} />
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Quick Suggestion Chips */}
        <View style={styles.chipsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {QUICK_CHIPS.map((chip, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.chip}
                onPress={() => handleSend(chip)}
                activeOpacity={0.8}
              >
                <Text style={styles.chipText}>{chip}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Text Input Row */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder={`Message ${driverName}...`}
            placeholderTextColor={colors.textTertiary}
            multiline
            maxLength={300}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
            onPress={() => handleSend()}
            disabled={!inputText.trim() || isSending}
          >
            <Ionicons name="send" size={18} color={colors.accentText} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverHeaderCol: {
    flex: 1,
    marginHorizontal: spacing.md,
  },
  driverNameText: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.heavy,
    color: colors.textPrimary,
  },
  carInfoText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  callBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesList: {
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
  safetyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.pill,
    marginBottom: spacing.lg,
    alignSelf: 'center',
  },
  safetyNoticeText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.semibold,
    color: '#059669',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  messageBubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: colors.accent,
    borderBottomRightRadius: 2,
  },
  messageBubbleDriver: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 2,
  },
  messageText: {
    fontSize: typography.fontSizes.sm,
    lineHeight: 20,
  },
  messageTextUser: {
    color: colors.accentText,
    fontWeight: typography.fontWeights.medium,
  },
  messageTextDriver: {
    color: colors.textPrimary,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 4,
  },
  timestampText: {
    fontSize: 9,
    color: colors.textTertiary,
  },
  chipsContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceMuted,
  },
  chip: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.pill,
    marginRight: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    maxHeight: 90,
    fontSize: typography.fontSizes.sm,
    color: colors.textPrimary,
    marginRight: spacing.sm,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
});

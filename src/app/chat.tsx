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

// ─── Quick Reply Chips ────────────────────────────────────────────────────────
const QUICK_CHIPS = [
  '📍 Where to meet?',
  '⏰ I\'m 5 min away',
  '🎒 1 bag, no large luggage',
  '☕ Coffee break?',
  '✅ Confirmed!',
  '🆘 Need help',
];

// ─── Helper: avatar color from name ──────────────────────────────────────────
const AVATAR_COLORS = ['#0284C7', '#7C3AED', '#059669', '#DC2626', '#D97706', '#DB2777'];
function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ─── Helper: group messages by time ──────────────────────────────────────────
interface MessageGroup {
  timeLabel: string;
  messages: ChatMessage[];
}

function groupMessagesByTime(messages: ChatMessage[]): MessageGroup[] {
  const groups: MessageGroup[] = [];
  messages.forEach((msg) => {
    const label = msg.timestamp || '';
    const last = groups[groups.length - 1];
    if (last && last.timeLabel === label) {
      last.messages.push(msg);
    } else {
      groups.push({ timeLabel: label, messages: [msg] });
    }
  });
  return groups;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
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
    const phone = (ride?.driver as any)?.phone || '';
    if (phone) {
      Linking.openURL(`tel:${phone}`).catch(() => {
        Alert.alert('Host Phone', `Call ${driverName} at ${phone}`);
      });
    } else {
      Alert.alert('Host Phone', 'Host phone contact is shared upon booking confirmation.');
    }
  };

  const driverName = ride?.driver.name || 'Driver';
  const carInfo = ride ? `${ride.car.make} ${ride.car.model} • ${ride.car.color}` : 'Car';
  const driverInitials = driverName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const driverAvatarColor = avatarColor(driverName);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/rides');
    }
  };

  const messageGroups = groupMessagesByTime(messages);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* ── Top Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        {/* Driver Avatar */}
        <View style={[styles.headerAvatar, { backgroundColor: driverAvatarColor }]}>
          <Text style={styles.headerAvatarText}>{driverInitials}</Text>
        </View>

        {/* Driver Info */}
        <View style={styles.driverHeaderCol}>
          <Text style={styles.driverNameText}>{driverName}</Text>
          <View style={styles.onlineRow}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>Online</Text>
            <Text style={styles.carInfoText} numberOfLines={1}>
              {' · '}
              {carInfo}
              {ride?.car.licensePlate ? ` · ${ride.car.licensePlate}` : ''}
            </Text>
          </View>
        </View>

        {/* Call Button */}
        <TouchableOpacity style={styles.callBtn} onPress={handleCall} accessibilityLabel="Call driver">
          <Ionicons name="call" size={18} color={colors.success} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* ── Messages List ── */}
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {/* Safety Notice */}
          <View style={styles.safetyNotice}>
            <Ionicons name="lock-closed" size={12} color={colors.success} />
            <Text style={styles.safetyNoticeText}>
              End-to-end encrypted carpool chat. Never share private bank OTPs.
            </Text>
          </View>

          {/* Message Groups with Timestamps */}
          {messageGroups.map((group, gi) => (
            <View key={gi}>
              {/* Time Label */}
              {group.timeLabel ? (
                <View style={styles.timeLabelRow}>
                  <Text style={styles.timeLabelText}>{group.timeLabel}</Text>
                </View>
              ) : null}

              {group.messages.map((msg) => {
                const isMe = msg.sender === 'passenger';
                return (
                  <View
                    key={msg.id}
                    style={[
                      styles.messageBubbleWrap,
                      isMe ? styles.messageBubbleWrapUser : styles.messageBubbleWrapDriver,
                    ]}
                  >
                    {/* Driver small avatar */}
                    {!isMe && (
                      <View style={[styles.msgAvatar, { backgroundColor: driverAvatarColor }]}>
                        <Text style={styles.msgAvatarText}>{driverInitials}</Text>
                      </View>
                    )}

                    <View
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
                        {isMe && (
                          <Ionicons
                            name={msg.status === 'read' ? 'checkmark-done' : 'checkmark'}
                            size={12}
                            color={colors.accentText}
                          />
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
        </ScrollView>

        {/* ── Quick Reply Chips ── */}
        <View style={styles.chipsBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
          >
            {QUICK_CHIPS.map((chip, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.chip}
                onPress={() => handleSend(chip)}
                activeOpacity={0.75}
              >
                <Text style={styles.chipText}>{chip}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── Input Bar ── */}
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
            <Ionicons name="arrow-up" size={20} color={colors.accentText} />
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

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: {
    color: '#FFFFFF',
    fontWeight: typography.fontWeights.bold,
    fontSize: typography.fontSizes.sm,
  },
  driverHeaderCol: {
    flex: 1,
  },
  driverNameText: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.heavy,
    color: colors.textPrimary,
  },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.success,
    marginRight: 4,
  },
  onlineText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.semibold,
    color: colors.success,
  },
  carInfoText: {
    fontSize: 10,
    color: colors.textTertiary,
    flexShrink: 1,
  },
  callBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Messages ──
  messagesList: {
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
  safetyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: colors.successSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.pill,
    marginBottom: spacing.lg,
    alignSelf: 'center',
  },
  safetyNoticeText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.semibold,
    color: colors.success,
  },

  // Timestamp group label
  timeLabelRow: {
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  timeLabelText: {
    fontSize: 10,
    color: colors.textTertiary,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.pill,
    fontWeight: typography.fontWeights.medium,
  },

  // Message bubble layout
  messageBubbleWrap: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
    alignItems: 'flex-end',
  },
  messageBubbleWrapUser: {
    justifyContent: 'flex-end',
  },
  messageBubbleWrapDriver: {
    justifyContent: 'flex-start',
  },
  msgAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    marginBottom: 2,
  },
  msgAvatarText: {
    color: '#FFFFFF',
    fontWeight: typography.fontWeights.bold,
    fontSize: 9,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  messageBubbleUser: {
    backgroundColor: colors.accent,
    borderBottomRightRadius: 3,
  },
  messageBubbleDriver: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 3,
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
    marginTop: 3,
    gap: 2,
  },

  // ── Quick Chips ──
  chipsBar: {
    backgroundColor: colors.accentSoft,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: spacing.xs,
  },
  chipsScroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  chip: {
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: borderRadius.pill,
    borderWidth: 1.5,
    borderColor: colors.accent,
    marginRight: spacing.xs,
  },
  chipText: {
    fontSize: 11,
    color: colors.accentText,
    fontWeight: typography.fontWeights.semibold,
  },

  // ── Input Bar ──
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    maxHeight: 90,
    fontSize: typography.fontSizes.sm,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.glowLime,
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
});

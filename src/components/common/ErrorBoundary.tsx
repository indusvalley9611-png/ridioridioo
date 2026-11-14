/**
 * NEXORA RIDE — Production Root Error Boundary
 *
 * Catches unhandled render exceptions and displays a graceful
 * recovery screen instead of crashing the native Android application.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '@/theme/tokens';
import { BrandLogo } from './BrandLogo';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });
    // In production, send to telemetry (Sentry/Bugsnag)
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  handleRestart = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.logoRow}>
              <BrandLogo size="md" variant="light" />
            </View>

            <View style={styles.card}>
              <View style={styles.iconCircle}>
                <Ionicons name="refresh-circle" size={48} color={colors.accent} />
              </View>

              <Text style={styles.title}>Something went wrong</Text>
              <Text style={styles.subtitle}>
                An unexpected issue occurred. Your saved rides and session data are secure.
              </Text>

              {this.state.error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorTitle}>Error Reference:</Text>
                  <Text style={styles.errorText} numberOfLines={3}>
                    {this.state.error.toString()}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.retryBtn}
                onPress={this.handleRestart}
                activeOpacity={0.88}
              >
                <Ionicons name="reload" size={18} color={colors.accentText} />
                <Text style={styles.retryBtnText}>Reload App</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101828',
  },
  content: {
    padding: spacing.xl,
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoRow: {
    marginBottom: spacing.xxl,
  },
  card: {
    width: '100%',
    backgroundColor: '#1E293B',
    borderRadius: borderRadius.xxl,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    ...shadows.lg,
  },
  iconCircle: {
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.heavy,
    color: '#FFFFFF',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.fontSizes.sm,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  errorBox: {
    width: '100%',
    backgroundColor: '#0F172A',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: '#334155',
  },
  errorTitle: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: '#94A3B8',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  errorText: {
    fontSize: 11,
    color: '#F87171',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  retryBtn: {
    width: '100%',
    backgroundColor: colors.accent,
    height: 50,
    borderRadius: borderRadius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    ...shadows.sm,
  },
  retryBtnText: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    color: colors.accentText,
  },
});

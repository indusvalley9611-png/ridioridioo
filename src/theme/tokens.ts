/**
 * NEXORA RIDE - Design Tokens
 * 
 * Brand Identity:
 * - Primary: Midnight Navy (#101828)
 * - Accent: Electric Lime (#C7F36B)
 * - Background: Off-white (#F8FAFC)
 * - Surface: Pure White (#FFFFFF)
 * - Primary Text: Dark Charcoal (#0F172A)
 * - Secondary Text: Muted Grey (#64748B)
 */

export const colors = {
  // Brand Base
  primary: '#101828',       // Midnight navy
  primaryLight: '#1E293B',  // Slate navy
  primaryHover: '#0B111D',  // Deepest navy

  accent: '#C7F36B',        // Electric lime
  accentHover: '#B5E655',   // Slightly darker lime
  accentSoft: '#F0FBD7',    // Pastel lime tint
  accentText: '#0A2500',    // High-contrast dark text on lime

  // Background & Surfaces
  background: '#F8FAFC',    // Soft cool off-white
  surface: '#FFFFFF',       // Pure white card surface
  surfaceMuted: '#F1F5F9',  // Subtle light grey surface
  surfaceDark: '#1E293B',   // Dark card surface

  // Typography
  textPrimary: '#0F172A',   // Dark charcoal
  textSecondary: '#64748B', // Muted cool grey
  textTertiary: '#94A3B8',  // Light grey
  textInverse: '#FFFFFF',   // White text on dark
  textInverseMuted: '#94A3B8',

  // Borders & Dividers
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',
  borderDark: '#334155',

  // Status & Semantic
  success: '#10B981',
  successSoft: '#ECFDF5',
  warning: '#F59E0B',
  warningSoft: '#FFFBEB',
  error: '#EF4444',
  errorSoft: '#FEF2F2',
  info: '#3B82F6',
  infoSoft: '#EFF6FF',
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  pill: 9999,
} as const;

export const typography = {
  fontSizes: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    xxl: 28,
    display: 34,
  },
  fontWeights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
  },
} as const;

export const shadows = {
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  glowLime: {
    shadowColor: '#C7F36B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 6,
  },
} as const;

export const theme = {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
};

export type Theme = typeof theme;
export default theme;

// ─── Colors ───────────────────────────────────────────────────────────────────
export const COLORS = {
  primary: '#F59E0B',      // taxi gold/yellow
  primaryDark: '#D97706',
  dark: '#111827',
  darkGray: '#374151',
  mediumGray: '#6B7280',
  lightGray: '#F3F4F6',
  border: '#E5E7EB',
  white: '#FFFFFF',
  green: '#10B981',
  red: '#EF4444',
  blue: '#3B82F6',
  overlay: 'rgba(0,0,0,0.4)',
} as const;

// ─── Typography ───────────────────────────────────────────────────────────────
export const FONT_SIZE = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 30,
} as const;

// ─── Spacing ──────────────────────────────────────────────────────────────────
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// ─── Storage keys ─────────────────────────────────────────────────────────────
export const TOKEN_STORAGE_KEY = 'bebe_taxi_token';

// ─── Map ──────────────────────────────────────────────────────────────────────
export const DEFAULT_REGION = {
  latitude: 36.8189,    // Tunis as default
  longitude: 10.1658,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

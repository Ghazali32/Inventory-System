export const colors = {
  primary: '#2D6A4F',
  primaryDark: '#1B4332',
  primaryLight: '#52B788',
  primaryLightest: '#D8F3DC',

  accent: '#F4D35E',
  accentDark: '#E6C04B',
  accentLight: '#FFF3C4',

  background: '#F5F5F0',
  surface: '#FFFFFF',
  surfaceAlt: '#E8F5E9',
  surfaceElevated: '#FAFAF8',

  text: '#1A1A1A',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textInverse: '#FFFFFF',

  danger: '#E63946',
  dangerLight: '#FEE2E2',
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  info: '#3B82F6',
  infoLight: '#DBEAFE',

  border: '#E0E0E0',
  borderLight: '#F0F0F0',
  divider: '#F3F4F6',

  shadow: 'rgba(0, 0, 0, 0.08)',
  overlay: 'rgba(0, 0, 0, 0.5)',

  tabInactive: '#9CA3AF',
  tabActive: '#2D6A4F',

  skeleton: '#E5E7EB',
  skeletonHighlight: '#F3F4F6',
} as const;

export type ColorKey = keyof typeof colors;

export const colors = {
  primary: '#8B5CF6',
  primaryLight: '#EFE9FE',
  primaryMid: '#CFC0FA',
  primarySoft: '#F6F2FE',

  secondary: '#D9734A',
  secondaryLight: '#FAE1D3',

  brandInk: '#0F0E0C',
  brandPaper: '#F5F2EC',
  brandMint: '#DCE8CF',
  brandAccent: '#7AAD4A',

  success: '#16A34A',
  successLight: '#DCFCE7',

  danger: '#EF4444',
  dangerLight: '#FEE2E2',

  warning: '#F59E0B',
  warningLight: '#FEF3C7',

  bg: '#FFFFFF',
  bgSecondary: '#F5F5F7',
  bgTertiary: '#EEEEEF',

  text: '#1A1A1A',
  textSecondary: '#6B6B6B',
  textTertiary: '#AAAAAA',

  border: '#E0E0E0',
  borderLight: '#F0F0F0',

  white: '#FFFFFF',
  black: '#000000',
};

export const fonts = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

// Categorías de tiendas: `color` es el tono vivo (íconos, acentos, badges),
// `bg` es la versión pastel para fondos de chip/tarjeta.
export const categories = [
  { id: 'all', label: 'Todos', emoji: null, color: colors.primary, bg: colors.primaryLight },
  { id: 'food', label: 'Comida', emoji: '🍕', color: '#C97B3D', bg: '#F5E4D0' },
  { id: 'fashion', label: 'Moda', emoji: '👗', color: '#EC4899', bg: '#FCE4F1' },
  { id: 'tech', label: 'Tecnología', emoji: '📱', color: '#3B82F6', bg: '#DCEAFE' },
  { id: 'health', label: 'Salud', emoji: '💊', color: '#EF4444', bg: '#FDE2E2' },
  { id: 'coffee', label: 'Café', emoji: '☕', color: '#B45309', bg: '#F6E3CB' },
  { id: 'nature', label: 'Natural', emoji: '🌿', color: '#22C55E', bg: '#DCFCE3' },
  { id: 'shoes', label: 'Calzado', emoji: '👟', color: '#7C6BA8', bg: '#E9E4F4' },
];

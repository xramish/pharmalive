/**
 * Pharmalive design system — one place for colors, type, spacing, radius, shadows.
 * Brand: pharma teal (trust, health) + deep teal for headers + mint accent.
 */
import { Platform, type TextStyle, type ViewStyle } from 'react-native';

export const colors = {
  brand: '#0F766E',
  brandDark: '#0B3B3C',
  brandDeep: '#082A2B',
  brandSoft: '#E4F4F1',
  mint: '#5EEAD4',

  bg: '#F2F5F7',
  surface: '#FFFFFF',
  surfaceAlt: '#F7F9FA',
  border: '#E3E8EC',
  borderStrong: '#CBD4DB',

  text: '#0F1B24',
  text2: '#4B5B67',
  text3: '#8A98A3',
  onBrand: '#FFFFFF',
  onBrandMuted: '#A7CFCB',

  success: '#16A34A',
  successDark: '#15803D',
  successSoft: '#E6F6EC',
  warning: '#D97706',
  warningSoft: '#FEF3E2',
  danger: '#DC2626',
  dangerSoft: '#FDECEC',
  info: '#2563EB',
  infoSoft: '#E8EFFE',
  violet: '#7C3AED',
  violetSoft: '#F1EAFE',

  overlay: 'rgba(8, 20, 24, 0.55)',
} as const;

export const font = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
} as const;

export const type: Record<string, TextStyle> = {
  display: { fontFamily: font.extrabold, fontSize: 28, lineHeight: 34, letterSpacing: -0.4, color: colors.text },
  h1: { fontFamily: font.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.2, color: colors.text },
  h2: { fontFamily: font.bold, fontSize: 18, lineHeight: 24, color: colors.text },
  h3: { fontFamily: font.semibold, fontSize: 16, lineHeight: 22, color: colors.text },
  body: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: colors.text2 },
  bodyStrong: { fontFamily: font.semibold, fontSize: 15, lineHeight: 22, color: colors.text },
  small: { fontFamily: font.medium, fontSize: 13, lineHeight: 18, color: colors.text3 },
  caption: { fontFamily: font.semibold, fontSize: 11.5, lineHeight: 14, letterSpacing: 0.6, color: colors.text3, textTransform: 'uppercase' },
  button: { fontFamily: font.bold, fontSize: 16, letterSpacing: 0.1 },
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;
export const radius = { sm: 10, md: 14, lg: 18, xl: 24, pill: 999 } as const;

export function shadow(level: 1 | 2 | 3): ViewStyle {
  const e = { 1: 2, 2: 5, 3: 10 }[level];
  return Platform.select<ViewStyle>({
    android: { elevation: e },
    default: {
      shadowColor: '#0B2530',
      shadowOpacity: { 1: 0.06, 2: 0.1, 3: 0.16 }[level],
      shadowRadius: { 1: 4, 2: 10, 3: 20 }[level],
      shadowOffset: { width: 0, height: { 1: 1, 2: 4, 3: 8 }[level] },
    },
  })!;
}

/** Status → colors + Uzbek label + icon, used everywhere a delivery status is shown. */
export const statusStyle: Record<string, { fg: string; bg: string; label: string; icon: string }> = {
  assigned: { fg: colors.violet, bg: colors.violetSoft, label: 'Olib ketish kerak', icon: 'cube-outline' },
  on_the_way: { fg: colors.warning, bg: colors.warningSoft, label: "Yo'lda", icon: 'navigate-outline' },
  delivered: { fg: colors.success, bg: colors.successSoft, label: 'Yetkazildi', icon: 'checkmark-circle' },
  failed: { fg: colors.danger, bg: colors.dangerSoft, label: 'Yetkazilmadi', icon: 'close-circle' },
};

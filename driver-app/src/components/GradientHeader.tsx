import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, space } from '../theme';
import { IconButton, T } from './kit';

/**
 * Brand gradient header used at the top of every main screen.
 * `extend` adds room at the bottom so a card can overlap the header.
 */
export function GradientHeader({ title, subtitle, back, right, children, extend = 0, style }: {
  title?: string; subtitle?: string; back?: boolean; right?: ReactNode; children?: ReactNode; extend?: number; style?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient
      colors={[colors.brandDark, colors.brand]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[{ paddingTop: insets.top + 10, paddingBottom: space.xl + extend, paddingHorizontal: space.lg }, style]}
    >
      {/* soft decorative circles */}
      <View style={[st.blob, { top: -60, right: -40, width: 180, height: 180 }]} />
      <View style={[st.blob, { top: 40, right: 80, width: 70, height: 70, opacity: 0.05 }]} />
      {(title || back || right) ? (
        <View style={st.row}>
          {back ? <IconButton name="chevron-back" label="Orqaga" onPress={() => router.back()} bg="rgba(255,255,255,0.14)" color="#fff" size={40} /> : null}
          <View style={{ flex: 1 }}>
            {title ? <T v="h1" color="#fff" numberOfLines={1}>{title}</T> : null}
            {subtitle ? <T v="small" color={colors.onBrandMuted} numberOfLines={1}>{subtitle}</T> : null}
          </View>
          {right}
        </View>
      ) : null}
      {children}
    </LinearGradient>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  blob: { position: 'absolute', borderRadius: 999, backgroundColor: '#fff', opacity: 0.07 },
});

import { ActivityIndicator, Pressable, StyleSheet, Text, View, type PressableProps, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';

export const C = {
  bg: '#f2f5f7',
  surface: '#ffffff',
  border: '#e1e7ec',
  text: '#15212b',
  text2: '#4f5f6c',
  text3: '#8594a0',
  primary: '#0f766e',
  primaryDark: '#0d2b2e',
  primarySoft: '#e3f3f1',
  ok: '#15803d',
  okSoft: '#e5f5ea',
  warn: '#b45309',
  warnSoft: '#fdf1e0',
  danger: '#c2372d',
  dangerSoft: '#fdebea',
  violet: '#6d28d9',
  violetSoft: '#f0e9ff',
};

type Variant = 'primary' | 'success' | 'danger' | 'outline' | 'ghost';

export function Button({
  title, onPress, variant = 'primary', big, loading, disabled, style, icon,
}: {
  title: string; onPress?: PressableProps['onPress']; variant?: Variant; big?: boolean;
  loading?: boolean; disabled?: boolean; style?: ViewStyle; icon?: string;
}) {
  const bg = { primary: C.primary, success: C.ok, danger: C.danger, outline: C.surface, ghost: 'transparent' }[variant];
  const fg = variant === 'outline' || variant === 'ghost' ? C.text : '#fff';
  const border = variant === 'outline' ? C.border : bg;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        s.btn, big && s.btnBig, { backgroundColor: bg, borderColor: border },
        (disabled || loading) && { opacity: 0.5 }, pressed && { opacity: 0.8 }, style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : (
        <Text style={[s.btnText, big && s.btnTextBig, { color: fg }]}>{icon ? `${icon}  ` : ''}{title}</Text>
      )}
    </Pressable>
  );
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: ViewStyle; onPress?: () => void }) {
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [s.card, style, pressed && { backgroundColor: '#f7fafa' }]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[s.card, style]}>{children}</View>;
}

const STATUS: Record<string, [string, string]> = {
  assigned: [C.violet, C.violetSoft],
  on_the_way: [C.warn, C.warnSoft],
  delivered: [C.ok, C.okSoft],
  failed: [C.danger, C.dangerSoft],
};

export function StatusChip({ status, label }: { status: string; label: string }) {
  const [fg, bg] = STATUS[status] ?? [C.text2, '#eef1f3'];
  return (
    <View style={[s.chip, { backgroundColor: bg }]}>
      <View style={[s.dot, { backgroundColor: fg }]} />
      <Text style={[s.chipText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function Banner({ kind, text }: { kind: 'error' | 'warn' | 'ok' | 'info'; text: string }) {
  const map = { error: [C.danger, C.dangerSoft], warn: [C.warn, C.warnSoft], ok: [C.ok, C.okSoft], info: [C.primary, C.primarySoft] } as const;
  const [fg, bg] = map[kind];
  return (
    <View style={[s.banner, { backgroundColor: bg, borderColor: fg + '33' }]}>
      <Text style={{ color: fg, fontSize: 15, lineHeight: 21, fontWeight: '600' }}>{text}</Text>
    </View>
  );
}

export function Row({ label, value, onPress }: { label: string; value: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={[s.rowValue, onPress && { color: C.primary, fontWeight: '700' }]}>{value || '—'}</Text>
    </Pressable>
  );
}

export const s = StyleSheet.create({
  btn: { height: 48, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  btnBig: { height: 64, borderRadius: 16 },
  btnText: { fontSize: 16, fontWeight: '700' },
  btnTextBig: { fontSize: 20, letterSpacing: 0.3 },
  card: { backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 14 },
  chip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 99, gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  chipText: { fontSize: 12.5, fontWeight: '700' },
  banner: { borderRadius: 12, padding: 12, borderWidth: 1, marginBottom: 12 },
  row: { flexDirection: 'row', paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border, gap: 12 },
  rowLabel: { width: 110, color: C.text3, fontSize: 14 },
  rowValue: { flex: 1, color: C.text, fontSize: 15 },
  h1: { fontSize: 22, fontWeight: '800', color: C.text },
  muted: { color: C.text3, fontSize: 13 },
});

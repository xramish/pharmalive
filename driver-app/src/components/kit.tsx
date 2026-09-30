import { useEffect, useRef, type ReactNode } from 'react';
import {
  ActivityIndicator, Animated, Pressable, StyleSheet, Text, View,
  type StyleProp, type TextStyle, type ViewStyle,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, font, radius, shadow, space, statusStyle, type } from '../theme';

// ------------------------------------------------------------------ Text

type TVariant = keyof typeof type;
export function T({ v = 'body', style, children, numberOfLines, color }: {
  v?: TVariant; style?: StyleProp<TextStyle>; children: ReactNode; numberOfLines?: number; color?: string;
}) {
  return <Text numberOfLines={numberOfLines} style={[type[v], color ? { color } : null, style]}>{children}</Text>;
}

// ------------------------------------------------------------------ Icons

export type IconName = keyof typeof Ionicons.glyphMap;
export type McIconName = keyof typeof MaterialCommunityIcons.glyphMap;

export function Icon({ name, size = 20, color = colors.text2 }: { name: IconName; size?: number; color?: string }) {
  return <Ionicons name={name} size={size} color={color} />;
}
export function McIcon({ name, size = 20, color = colors.text2 }: { name: McIconName; size?: number; color?: string }) {
  return <MaterialCommunityIcons name={name} size={size} color={color} />;
}

/** Icon inside a soft colored circle. */
export function IconBadge({ name, color = colors.brand, bg = colors.brandSoft, size = 40, mc }: {
  name: string; color?: string; bg?: string; size?: number; mc?: boolean;
}) {
  const iconSize = Math.round(size * 0.5);
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      {mc ? <McIcon name={name as McIconName} size={iconSize} color={color} /> : <Icon name={name as IconName} size={iconSize} color={color} />}
    </View>
  );
}

// ------------------------------------------------------------------ Pressable with scale feedback

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Pressable that shrinks slightly when touched. The style goes on the pressable
 * itself, so layout props (flex, width) work exactly like on a View.
 */
export function Tap({ onPress, disabled, style, children, haptic = true, accessibilityLabel }: {
  onPress?: () => void; disabled?: boolean; style?: StyleProp<ViewStyle>; children: ReactNode; haptic?: boolean; accessibilityLabel?: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v: number) => Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPressIn={() => to(0.97)}
      onPressOut={() => to(1)}
      onPress={() => {
        if (haptic) void Haptics.selectionAsync();
        onPress?.();
      }}
      style={[style, { transform: [{ scale }] }, disabled && { opacity: 0.45 }]}
    >
      {children}
    </AnimatedPressable>
  );
}

// ------------------------------------------------------------------ Buttons

type BVariant = 'primary' | 'success' | 'danger' | 'secondary' | 'ghost' | 'dangerOutline' | 'light';
const BV: Record<BVariant, { bg: string; fg: string; border: string }> = {
  primary: { bg: colors.brand, fg: '#fff', border: colors.brand },
  success: { bg: colors.success, fg: '#fff', border: colors.success },
  danger: { bg: colors.danger, fg: '#fff', border: colors.danger },
  secondary: { bg: colors.surface, fg: colors.text, border: colors.border },
  ghost: { bg: 'transparent', fg: colors.brand, border: 'transparent' },
  dangerOutline: { bg: colors.surface, fg: colors.danger, border: '#F5C2C2' },
  light: { bg: 'rgba(255,255,255,0.16)', fg: '#fff', border: 'rgba(255,255,255,0.28)' },
};

export function Button({ title, onPress, variant = 'primary', size = 'md', icon, mcIcon, loading, disabled, style }: {
  title: string; onPress?: () => void; variant?: BVariant; size?: 'sm' | 'md' | 'lg';
  icon?: IconName; mcIcon?: McIconName; loading?: boolean; disabled?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const v = BV[variant];
  const h = { sm: 40, md: 50, lg: 58 }[size];
  const fs = { sm: 14, md: 16, lg: 17 }[size];
  return (
    <Tap onPress={onPress} disabled={disabled || loading} style={[
      st.btn, { height: h, backgroundColor: v.bg, borderColor: v.border }, variant === 'primary' || variant === 'success' ? shadow(1) : null, style,
    ]}>
      {loading ? <ActivityIndicator color={v.fg} /> : (
        <View style={st.btnRow}>
          {icon ? <Icon name={icon} size={fs + 4} color={v.fg} /> : null}
          {mcIcon ? <McIcon name={mcIcon} size={fs + 4} color={v.fg} /> : null}
          <Text style={[type.button, { color: v.fg, fontSize: fs }]}>{title}</Text>
        </View>
      )}
    </Tap>
  );
}

export function IconButton({ name, onPress, color = colors.text, bg = colors.surfaceAlt, size = 44, label, disabled }: {
  name: IconName; onPress?: () => void; color?: string; bg?: string; size?: number; label: string; disabled?: boolean;
}) {
  return (
    <Tap onPress={onPress} disabled={disabled} accessibilityLabel={label}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={name} size={Math.round(size * 0.46)} color={color} />
    </Tap>
  );
}

// ------------------------------------------------------------------ Surfaces

export function Card({ children, style, onPress, pad = true }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; pad?: boolean }) {
  const s = [st.card, pad && { padding: space.lg }, style];
  return onPress ? <Tap onPress={onPress} style={s}>{children}</Tap> : <View style={s}>{children}</View>;
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }, style]} />;
}

export function SectionTitle({ children, right }: { children: string; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.sm, marginTop: space.xs }}>
      <T v="caption">{children}</T>
      {right}
    </View>
  );
}

// ------------------------------------------------------------------ Status

export function StatusPill({ status, label, small }: { status: string; label?: string; small?: boolean }) {
  const s = statusStyle[status] ?? { fg: colors.text2, bg: colors.surfaceAlt, label: status, icon: 'ellipse-outline' };
  return (
    <View style={[st.pill, { backgroundColor: s.bg }, small && { paddingVertical: 3, paddingHorizontal: 8 }]}>
      <Icon name={s.icon as IconName} size={small ? 12 : 14} color={s.fg} />
      <Text style={[st.pillText, { color: s.fg }, small && { fontSize: 11.5 }]}>{label ?? s.label}</Text>
    </View>
  );
}

export function Chip({ icon, text, color = colors.text2, bg = colors.surfaceAlt }: { icon?: IconName; text: string; color?: string; bg?: string }) {
  return (
    <View style={[st.chip, { backgroundColor: bg }]}>
      {icon ? <Icon name={icon} size={13} color={color} /> : null}
      <Text style={[st.chipText, { color }]} numberOfLines={1}>{text}</Text>
    </View>
  );
}

// ------------------------------------------------------------------ Feedback

export function Notice({ kind, text, icon }: { kind: 'error' | 'warn' | 'ok' | 'info'; text: string; icon?: IconName }) {
  const m = {
    error: [colors.danger, colors.dangerSoft, 'alert-circle-outline'],
    warn: [colors.warning, colors.warningSoft, 'warning-outline'],
    ok: [colors.success, colors.successSoft, 'checkmark-circle'],
    info: [colors.brand, colors.brandSoft, 'information-circle-outline'],
  }[kind] as [string, string, IconName];
  return (
    <View style={[st.notice, { backgroundColor: m[1] }]}>
      <Icon name={icon ?? m[2]} size={20} color={m[0]} />
      <Text style={[type.bodyStrong, { color: m[0], flex: 1, fontSize: 14, lineHeight: 20 }]}>{text}</Text>
    </View>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: IconName; title: string; text?: string; action?: ReactNode }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24, gap: 10 }}>
      <View style={st.emptyIcon}><Icon name={icon} size={38} color={colors.brand} /></View>
      <T v="h2" style={{ textAlign: 'center', marginTop: 6 }}>{title}</T>
      {text ? <T v="body" style={{ textAlign: 'center' }}>{text}</T> : null}
      {action}
    </View>
  );
}

/** Pulsing placeholder while data loads. */
export function Skeleton({ h = 16, w = '100%', r = 8, style }: { h?: number; w?: number | `${number}%`; r?: number; style?: StyleProp<ViewStyle> }) {
  const o = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(o, { toValue: 1, duration: 650, useNativeDriver: true }),
      Animated.timing(o, { toValue: 0.5, duration: 650, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [o]);
  return <Animated.View style={[{ height: h, width: w, borderRadius: r, backgroundColor: '#E4EAEE', opacity: o }, style]} />;
}

export function DeliverySkeleton() {
  return (
    <Card style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Skeleton w={110} h={18} /><Skeleton w={90} h={22} r={11} /></View>
      <Skeleton w="70%" h={16} />
      <Skeleton w="90%" h={13} />
      <View style={{ flexDirection: 'row', gap: 8 }}><Skeleton w={80} h={24} r={12} /><Skeleton w={60} h={24} r={12} /></View>
    </Card>
  );
}

const st = StyleSheet.create({
  btn: { borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, ...shadow(1) },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingVertical: 5, paddingHorizontal: 10, borderRadius: radius.pill },
  pillText: { fontFamily: font.semibold, fontSize: 12.5 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 5, paddingHorizontal: 9, borderRadius: radius.pill, maxWidth: '100%' },
  chipText: { fontFamily: font.medium, fontSize: 12.5 },
  notice: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: 14, borderRadius: radius.md },
  emptyIcon: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
});

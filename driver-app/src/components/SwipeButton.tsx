import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, PanResponder, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, font, radius, shadow } from '../theme';
import { Icon } from './kit';

const KNOB = 56;
const PAD = 4;

/**
 * "Swipe to confirm" — prevents accidental taps (phone in a pocket, driving).
 * The driver drags the knob to the end; releasing earlier springs it back.
 */
export function SwipeButton({ label, onConfirm, disabled, loading, color = colors.success }: {
  label: string; onConfirm: () => void; disabled?: boolean; loading?: boolean; color?: string;
}) {
  const [width, setWidth] = useState(0);
  const x = useRef(new Animated.Value(0)).current;
  const max = Math.max(0, width - KNOB - PAD * 2);
  const maxRef = useRef(0);
  maxRef.current = max;
  const doneRef = useRef(false);
  const lockRef = useRef(false);
  lockRef.current = !!disabled || !!loading;

  // Reset after loading finishes with an error (knob returns to start)
  useEffect(() => {
    if (!loading) {
      doneRef.current = false;
      Animated.spring(x, { toValue: 0, useNativeDriver: false, bounciness: 8 }).start();
    }
  }, [loading, x]);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !lockRef.current,
      onMoveShouldSetPanResponder: (_, g) => !lockRef.current && Math.abs(g.dx) > 4,
      onPanResponderGrant: () => { void Haptics.selectionAsync(); },
      onPanResponderMove: (_, g) => x.setValue(Math.min(Math.max(0, g.dx), maxRef.current)),
      onPanResponderRelease: (_, g) => {
        if (g.dx >= maxRef.current * 0.88 && !doneRef.current) {
          doneRef.current = true;
          Animated.timing(x, { toValue: maxRef.current, duration: 120, useNativeDriver: false }).start();
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onConfirmRef.current();
        } else {
          Animated.spring(x, { toValue: 0, useNativeDriver: false, bounciness: 10 }).start();
        }
      },
      onPanResponderTerminate: () => Animated.spring(x, { toValue: 0, useNativeDriver: false }).start(),
    }),
  ).current;
  const onConfirmRef = useRef(onConfirm);
  onConfirmRef.current = onConfirm;

  const fill = x.interpolate({ inputRange: [0, Math.max(1, max)], outputRange: [KNOB + PAD, Math.max(KNOB + PAD + 1, width)], extrapolate: 'clamp' });
  const labelOpacity = x.interpolate({ inputRange: [0, Math.max(1, max * 0.6)], outputRange: [1, 0], extrapolate: 'clamp' });

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      style={[st.track, { backgroundColor: disabled ? colors.border : color + '22', borderColor: disabled ? colors.border : color + '55' }]}
      accessibilityRole="adjustable"
      accessibilityLabel={label}
    >
      {!disabled ? <Animated.View style={[st.fill, { width: fill, backgroundColor: color }]} /> : null}
      <Animated.Text style={[st.label, { color: disabled ? colors.text3 : color, opacity: labelOpacity }]} numberOfLines={1}>
        {label}
      </Animated.Text>
      <Animated.View {...pan.panHandlers} style={[st.knob, { backgroundColor: disabled ? colors.borderStrong : color, transform: [{ translateX: x }] }]}>
        {loading ? <ActivityIndicator color="#fff" /> : <Icon name="chevron-forward" size={28} color="#fff" />}
      </Animated.View>
      {!disabled ? <Text style={st.arrows}>›››</Text> : null}
    </View>
  );
}

const st = StyleSheet.create({
  track: { height: KNOB + PAD * 2, borderRadius: radius.pill, borderWidth: 1, justifyContent: 'center', overflow: 'hidden' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: radius.pill, opacity: 0.18 },
  label: { position: 'absolute', left: KNOB + 18, right: 34, textAlign: 'center', fontFamily: font.bold, fontSize: 16.5, letterSpacing: 0.3 },
  knob: { position: 'absolute', left: PAD, width: KNOB, height: KNOB, borderRadius: KNOB / 2, alignItems: 'center', justifyContent: 'center', ...shadow(2) },
  arrows: { position: 'absolute', right: 16, fontSize: 22, color: colors.text3, fontFamily: font.bold, opacity: 0.6 },
});

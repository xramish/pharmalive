import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Icon, T } from '../components/kit';
import { colors, radius, space } from '../theme';

/** Full-screen result after a delivery (green) or a reported problem (amber). */
export default function Success() {
  const { result, number, pharmacy, reason } = useLocalSearchParams<{ result: string; number: string; pharmacy?: string; reason?: string }>();
  const insets = useSafeAreaInsets();
  const ok = result === 'delivered';
  const scale = useRef(new Animated.Value(0.3)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    void Haptics.notificationAsync(ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, bounciness: 14, speed: 10 }),
      Animated.timing(fade, { toValue: 1, duration: 450, delay: 150, useNativeDriver: true }),
      Animated.loop(Animated.timing(ring, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true }), { iterations: 2 }),
    ]).start();
  }, [ok, scale, fade, ring]);

  const grad: [string, string] = ok ? ['#0E7A55', '#16A34A'] : ['#9A4A0B', '#D97706'];
  const ringScale = ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] });
  const ringOpacity = ring.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });

  return (
    <LinearGradient colors={grad} style={[st.wrap, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={[st.ring, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]} />
          <Animated.View style={[st.circle, { transform: [{ scale }] }]}>
            <Icon name={ok ? 'checkmark' : 'alert'} size={72} color={ok ? colors.success : colors.warning} />
          </Animated.View>
        </View>
        <Animated.View style={{ opacity: fade, alignItems: 'center', marginTop: space.xxl, paddingHorizontal: space.xl }}>
          <T v="display" color="#fff" style={{ textAlign: 'center' }}>{ok ? 'Yetkazildi!' : 'Qayd etildi'}</T>
          <T v="h3" color="rgba(255,255,255,0.92)" style={{ marginTop: 8 }}>№ {number}</T>
          {pharmacy ? <T v="body" color="rgba(255,255,255,0.85)" style={{ textAlign: 'center', marginTop: 2 }}>{pharmacy}</T> : null}
          <View style={st.infoBox}>
            <Icon name={ok ? 'shield-checkmark-outline' : 'information-circle-outline'} size={18} color="#fff" />
            <T v="small" color="#fff" style={{ flex: 1, lineHeight: 18 }}>
              {ok
                ? 'Vaqt, joylashuv va rasm saqlandi. Rahbariyat buni darhol ko\'radi.'
                : `Sabab: ${reason || '—'}. Dispetcherga xabar berildi. Yukni omborga qaytaring yoki ko'rsatma kuting.`}
            </T>
          </View>
        </Animated.View>
      </View>
      <Animated.View style={{ opacity: fade, gap: space.md }}>
        <Button title="Keyingi yetkazish" icon="arrow-forward" size="lg" variant="secondary" onPress={() => router.dismissTo('/')} />
        {ok ? <Button title="Yana skanerlash" icon="scan-outline" variant="light" onPress={() => router.replace('/scan')} /> : null}
      </Animated.View>
    </LinearGradient>
  );
}

const st = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: space.xl },
  circle: { width: 132, height: 132, borderRadius: 66, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 132, height: 132, borderRadius: 66, borderWidth: 3, borderColor: '#fff' },
  infoBox: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: radius.md, padding: 14, marginTop: space.xl },
});

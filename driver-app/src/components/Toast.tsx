import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font, radius, shadow } from '../theme';
import { Icon, type IconName } from './kit';

type Kind = 'ok' | 'error' | 'info';
type ToastApi = { show: (text: string, kind?: Kind) => void };
const Ctx = createContext<ToastApi>({ show: () => undefined });

/** Small non-blocking message sliding from the top (replaces blocking Alert popups). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [msg, setMsg] = useState<{ text: string; kind: Kind } | null>(null);
  const y = useRef(new Animated.Value(-120)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((text: string, kind: Kind = 'info') => {
    if (timer.current) clearTimeout(timer.current);
    setMsg({ text, kind });
    Animated.spring(y, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
    timer.current = setTimeout(() => {
      Animated.timing(y, { toValue: -140, duration: 220, useNativeDriver: true }).start(() => setMsg(null));
    }, kind === 'error' ? 4200 : 2600);
  }, [y]);

  const k = msg?.kind ?? 'info';
  const bg = { ok: colors.successDark, error: colors.danger, info: colors.brandDark }[k];
  const icon: IconName = { ok: 'checkmark-circle', error: 'alert-circle', info: 'information-circle' }[k] as IconName;

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      {msg ? (
        <Animated.View pointerEvents="none" style={[st.wrap, { top: insets.top + 8, transform: [{ translateY: y }] }]}>
          <View style={[st.toast, { backgroundColor: bg }]}>
            <Icon name={icon} size={20} color="#fff" />
            <Text style={st.text}>{msg.text}</Text>
          </View>
        </Animated.View>
      ) : null}
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);

const st = StyleSheet.create({
  wrap: { position: 'absolute', left: 14, right: 14, zIndex: 100 },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13, paddingHorizontal: 16, borderRadius: radius.md, ...shadow(3) },
  text: { color: '#fff', fontFamily: font.semibold, fontSize: 14.5, flex: 1, lineHeight: 20 },
});

import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../lib/auth';
import { APP_VERSION } from '../lib/api';
import { Button, Icon, McIcon, Notice, T, Tap } from '../components/kit';
import { colors, font, radius, shadow, space } from '../theme';

export default function Login() {
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [focus, setFocus] = useState<'p' | 'w' | null>(null);

  async function submit() {
    if (!phone || !password) return;
    setError('');
    setBusy(true);
    try {
      await login(phone.replace(/[\s+()-]/g, ''), password);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <LinearGradient colors={[colors.brandDeep, colors.brandDark, colors.brand]} style={{ flex: 1 }}>
      <View style={[st.blob, { top: -90, right: -70, width: 260, height: 260 }]} />
      <View style={[st.blob, { top: 180, left: -60, width: 140, height: 140, opacity: 0.05 }]} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[st.wrap, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 }]} keyboardShouldPersistTaps="handled">
          <View style={st.brand}>
            <View style={st.logo}>
              <Icon name="medkit" size={34} color={colors.brand} />
              <View style={st.logoBadge}><McIcon name="truck-fast-outline" size={16} color="#fff" /></View>
            </View>
            <T v="display" color="#fff" style={{ marginTop: space.lg }}>Pharmalive</T>
            <T v="body" color={colors.onBrandMuted}>Haydovchilar uchun ilova</T>
          </View>

          <View style={st.card}>
            <T v="h2">Tizimga kirish</T>
            <T v="small" style={{ marginTop: 2, marginBottom: space.lg }}>Login va parolni dispetcher beradi</T>

            <T v="caption" style={st.label}>Telefon raqam</T>
            <View style={[st.field, focus === 'p' && st.fieldFocus]}>
              <Icon name="call-outline" size={20} color={focus === 'p' ? colors.brand : colors.text3} />
              <TextInput
                style={st.input} value={phone} onChangeText={setPhone} placeholder="998 90 123 45 67" placeholderTextColor={colors.text3}
                keyboardType="phone-pad" autoCapitalize="none" autoCorrect={false} textContentType="username"
                onFocus={() => setFocus('p')} onBlur={() => setFocus(null)}
              />
            </View>

            <T v="caption" style={st.label}>Parol</T>
            <View style={[st.field, focus === 'w' && st.fieldFocus]}>
              <Icon name="lock-closed-outline" size={20} color={focus === 'w' ? colors.brand : colors.text3} />
              <TextInput
                style={st.input} value={password} onChangeText={setPassword} secureTextEntry={!show} placeholder="••••••••"
                placeholderTextColor={colors.text3} autoCapitalize="none" textContentType="password" onSubmitEditing={submit}
                onFocus={() => setFocus('w')} onBlur={() => setFocus(null)}
              />
              <Tap onPress={() => setShow((v) => !v)} accessibilityLabel="Parolni ko'rsatish" haptic={false}>
                <Icon name={show ? 'eye-off-outline' : 'eye-outline'} size={21} color={colors.text3} />
              </Tap>
            </View>

            {error ? <View style={{ marginTop: space.md }}><Notice kind="error" text={error} /></View> : null}
            <Button title="Kirish" icon="arrow-forward" size="lg" onPress={submit} loading={busy} disabled={!phone || !password} style={{ marginTop: space.xl }} />
          </View>

          <View style={st.footer}>
            <Icon name="shield-checkmark-outline" size={14} color={colors.onBrandMuted} />
            <T v="small" color={colors.onBrandMuted}>Himoyalangan ulanish · v{APP_VERSION}</T>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const st = StyleSheet.create({
  wrap: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: space.xl },
  blob: { position: 'absolute', borderRadius: 999, backgroundColor: '#fff', opacity: 0.07 },
  brand: { alignItems: 'center', marginBottom: space.xxl },
  logo: { width: 76, height: 76, borderRadius: 24, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow(3) },
  logoBadge: { position: 'absolute', right: -8, bottom: -8, width: 32, height: 32, borderRadius: 16, backgroundColor: colors.brand, borderWidth: 3, borderColor: colors.brandDark, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: space.xl, ...shadow(3) },
  label: { marginBottom: 6, marginTop: space.md },
  field: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 54, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surfaceAlt, paddingHorizontal: 14 },
  fieldFocus: { borderColor: colors.brand, backgroundColor: '#fff' },
  input: { flex: 1, minWidth: 0, fontFamily: font.medium, fontSize: 16.5, color: colors.text, height: '100%' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: space.xl },
});

import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../lib/auth';
import { APP_VERSION } from '../lib/api';
import { Banner, Button, C } from '../components/ui';

export default function Login() {
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
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
    <SafeAreaView style={st.wrap}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={st.center}>
        <View style={st.brand}>
          <View style={st.mark}><Text style={st.markText}>+</Text></View>
          <Text style={st.title}>Pharmalive</Text>
          <Text style={st.sub}>Haydovchi ilovasi</Text>
        </View>

        <View style={st.card}>
          <Text style={st.label}>Login (telefon raqam)</Text>
          <TextInput
            style={st.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="998901234567"
            keyboardType="phone-pad"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="username"
          />
          <Text style={st.label}>Parol</Text>
          <TextInput
            style={st.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            textContentType="password"
            onSubmitEditing={submit}
          />
          {error ? <Banner kind="error" text={error} /> : null}
          <Button title="Kirish" big onPress={submit} loading={busy} disabled={!phone || !password} />
        </View>
        <Text style={st.version}>v{APP_VERSION}</Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.primaryDark },
  center: { flex: 1, justifyContent: 'center', padding: 22 },
  brand: { alignItems: 'center', marginBottom: 28 },
  mark: { width: 64, height: 64, borderRadius: 18, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  markText: { color: '#fff', fontSize: 44, fontWeight: '800', marginTop: -4 },
  title: { color: '#fff', fontSize: 28, fontWeight: '800' },
  sub: { color: '#8fb3b0', fontSize: 15, marginTop: 2 },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 18, gap: 8 },
  label: { color: C.text2, fontSize: 13, fontWeight: '700', marginTop: 4 },
  input: { height: 52, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, fontSize: 17, color: C.text, marginBottom: 6 },
  version: { color: '#5e8784', textAlign: 'center', marginTop: 18, fontSize: 12 },
});

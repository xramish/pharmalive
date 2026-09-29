import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, ApiError, type ScanResult } from '../lib/api';
import { setLastScan } from '../lib/session';
import { Button, C } from '../components/ui';

/**
 * Full-screen QR scanner. The code is validated by the SERVER (exists, belongs
 * to this driver, not delivered/cancelled/revoked). Every scan is logged there.
 */
export default function Scan() {
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const locked = useRef(false);

  async function onScanned(r: BarcodeScanningResult) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    try {
      const res = await api.post<ScanResult>('/driver/scan', { code: r.data });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setLastScan(res.data);
      router.replace('/confirm');
    } catch (e) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const err = e as ApiError;
      setError({ code: err.code, message: err.message });
      setBusy(false);
    }
  }

  function retry() {
    setError(null);
    locked.current = false;
  }

  if (!permission) return <View style={st.black} />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={[st.black, { justifyContent: 'center', padding: 24, gap: 14 }]}>
        <Text style={st.permText}>QR kodni skanerlash uchun kameraga ruxsat bering.</Text>
        <Button title="Ruxsat berish" onPress={requestPermission} />
        <Button title="Orqaga" variant="ghost" style={{ borderColor: 'transparent' }} onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  return (
    <View style={st.black}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={error || busy ? undefined : onScanned}
      />
      <SafeAreaView style={st.overlay} pointerEvents="box-none">
        <View style={st.top}>
          <Pressable onPress={() => router.back()} hitSlop={12}><Text style={st.topBtn}>✕  Yopish</Text></Pressable>
          <Pressable onPress={() => setTorch((t) => !t)} hitSlop={12}><Text style={st.topBtn}>{torch ? '🔦 O\'chirish' : '🔦 Chiroq'}</Text></Pressable>
        </View>

        <View style={st.frameWrap} pointerEvents="none">
          <View style={st.frame} />
          <Text style={st.hint}>Yuk ustidagi QR yorliqni ramkaga tushiring</Text>
        </View>

        <View style={st.bottom}>
          {busy ? (
            <View style={st.panel}><ActivityIndicator color={C.primary} /><Text style={st.panelText}>Tekshirilmoqda…</Text></View>
          ) : null}
          {error ? (
            <View style={[st.panel, { borderLeftColor: C.danger }]}>
              <Text style={[st.panelText, { color: C.danger, fontWeight: '800' }]}>
                {error.code === 'already_delivered' ? '✓ Allaqachon yetkazilgan' : '✕ Qabul qilinmadi'}
              </Text>
              <Text style={st.panelText}>{error.message}</Text>
              <Button title="Qayta skanerlash" onPress={retry} style={{ marginTop: 8 }} />
            </View>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

const st = StyleSheet.create({
  black: { flex: 1, backgroundColor: '#000' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'space-between' },
  top: { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  topBtn: { color: '#fff', fontSize: 16, fontWeight: '700', backgroundColor: 'rgba(0,0,0,.45)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, overflow: 'hidden' },
  frameWrap: { alignItems: 'center' },
  frame: { width: 250, height: 250, borderWidth: 4, borderColor: '#5eead4', borderRadius: 22 },
  hint: { color: '#fff', marginTop: 16, fontSize: 15, fontWeight: '600', textShadowColor: '#000', textShadowRadius: 6 },
  bottom: { padding: 16, minHeight: 140, justifyContent: 'flex-end' },
  panel: { backgroundColor: '#fff', borderRadius: 14, padding: 14, gap: 4, borderLeftWidth: 5, borderLeftColor: C.primary },
  panelText: { color: C.text, fontSize: 15, lineHeight: 21 },
  permText: { color: '#fff', fontSize: 17, textAlign: 'center', lineHeight: 24 },
});

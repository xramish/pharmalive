import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, ApiError, type ScanResult } from '../lib/api';
import { setLastScan } from '../lib/session';
import { Button, EmptyState, Icon, IconButton, T } from '../components/kit';
import { colors, radius, shadow, space } from '../theme';

const FRAME = 260;

/**
 * Full-screen QR scanner. The code is validated by the SERVER (exists, belongs
 * to this driver, not delivered/cancelled/revoked); every scan is logged there.
 */
export default function Scan() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const locked = useRef(false);
  const line = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(line, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(line, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [line]);

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

  const retry = () => { setError(null); locked.current = false; };

  if (!permission) return <View style={st.black} />;

  if (!permission.granted) {
    return (
      <View style={[st.black, { justifyContent: 'center', backgroundColor: colors.bg }]}>
        <EmptyState
          icon="camera-outline"
          title="Kameraga ruxsat kerak"
          text="Yuk ustidagi QR yorliqni skanerlash uchun kameraga ruxsat bering."
          action={<View style={{ alignSelf: 'stretch', gap: 10, marginTop: 10 }}>
            <Button title="Ruxsat berish" icon="camera-outline" onPress={requestPermission} />
            <Button title="Orqaga" variant="ghost" onPress={() => router.back()} />
          </View>}
        />
      </View>
    );
  }

  const translateY = line.interpolate({ inputRange: [0, 1], outputRange: [10, FRAME - 12] });
  const already = error?.code === 'already_delivered';

  return (
    <View style={st.black}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={error || busy ? undefined : onScanned}
      />

      {/* Dim everything except the frame */}
      <View style={st.mask} pointerEvents="none">
        <View style={st.maskFill} />
        <View style={{ flexDirection: 'row' }}>
          <View style={st.maskFill} />
          <View style={{ width: FRAME, height: FRAME }}>
            <View style={[st.corner, st.tl]} /><View style={[st.corner, st.tr]} />
            <View style={[st.corner, st.bl]} /><View style={[st.corner, st.br]} />
            {!error && !busy ? <Animated.View style={[st.line, { transform: [{ translateY }] }]} /> : null}
          </View>
          <View style={st.maskFill} />
        </View>
        <View style={[st.maskFill, { alignItems: 'center', paddingTop: space.xl }]}>
          <T v="bodyStrong" color="#fff" style={{ textAlign: 'center' }}>Yuk ustidagi QR yorliqni ramkaga tushiring</T>
          <T v="small" color="rgba(255,255,255,0.7)" style={{ marginTop: 4 }}>Avtomatik skanerlanadi</T>
        </View>
      </View>

      <View style={[st.top, { paddingTop: insets.top + 8 }]}>
        <IconButton name="close" label="Yopish" onPress={() => router.back()} bg="rgba(0,0,0,0.45)" color="#fff" />
        <T v="h3" color="#fff">QR skanerlash</T>
        <IconButton name={torch ? 'flashlight' : 'flashlight-outline'} label="Chiroq" onPress={() => setTorch((t) => !t)}
          bg={torch ? colors.mint : 'rgba(0,0,0,0.45)'} color={torch ? colors.brandDark : '#fff'} />
      </View>

      {(busy || error) ? (
        <View style={[st.sheet, { paddingBottom: insets.bottom + space.lg }]}>
          {busy ? (
            <View style={st.sheetRow}>
              <ActivityIndicator color={colors.brand} size="large" />
              <View><T v="h3">Tekshirilmoqda…</T><T v="small">Server QR kodni tasdiqlayapti</T></View>
            </View>
          ) : error ? (
            <>
              <View style={st.sheetRow}>
                <View style={[st.sheetIcon, { backgroundColor: already ? colors.successSoft : colors.dangerSoft }]}>
                  <Icon name={already ? 'checkmark-done' : 'close'} size={28} color={already ? colors.success : colors.danger} />
                </View>
                <View style={{ flex: 1 }}>
                  <T v="h3" color={already ? colors.success : colors.danger}>{already ? 'Allaqachon yetkazilgan' : 'Qabul qilinmadi'}</T>
                  <T v="body" style={{ fontSize: 14, lineHeight: 20 }}>{error.message}</T>
                </View>
              </View>
              <Button title="Qayta skanerlash" icon="refresh" onPress={retry} style={{ marginTop: space.lg }} />
            </>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const C = 34;
const st = StyleSheet.create({
  black: { flex: 1, backgroundColor: '#000' },
  mask: { ...StyleSheet.absoluteFill, justifyContent: 'center' },
  maskFill: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  corner: { position: 'absolute', width: C, height: C, borderColor: colors.mint },
  tl: { top: 0, left: 0, borderTopWidth: 5, borderLeftWidth: 5, borderTopLeftRadius: 20 },
  tr: { top: 0, right: 0, borderTopWidth: 5, borderRightWidth: 5, borderTopRightRadius: 20 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 5, borderLeftWidth: 5, borderBottomLeftRadius: 20 },
  br: { bottom: 0, right: 0, borderBottomWidth: 5, borderRightWidth: 5, borderBottomRightRadius: 20 },
  line: { position: 'absolute', left: 14, right: 14, height: 3, borderRadius: 2, backgroundColor: colors.mint, opacity: 0.9 },
  top: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: space.xl, ...shadow(3) },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  sheetIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
});

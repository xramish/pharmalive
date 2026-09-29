import { useEffect, useRef, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { api, ApiError, type AppConfig, type AttemptResult } from '../lib/api';
import { appConfig, getLastScan, setLastScan } from '../lib/session';
import { filePart, getGps, takePhoto, type Gps } from '../lib/device';
import { deviceTime, phone } from '../lib/format';
import { Banner, Button, C, Card, s } from '../components/ui';

/**
 * Last step: photo + GPS + "YETKAZILDI".
 * The client_request_id is created ONCE per screen, so pressing the button
 * again after a network error can never create a second delivery.
 */
export default function Confirm() {
  const scan = getLastScan();
  const requestId = useRef(Crypto.randomUUID()).current;
  const [cfg, setCfg] = useState<AppConfig | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [gps, setGps] = useState<Gps | null>(null);
  const [gpsState, setGpsState] = useState<'loading' | 'ok' | 'none'>('loading');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    appConfig().then(setCfg).catch(() => setCfg({ require_delivery_photo: true, require_delivery_gps: true } as AppConfig));
    void locate();
  }, []);

  async function locate() {
    setGpsState('loading');
    const g = await getGps();
    setGps(g);
    setGpsState(g ? 'ok' : 'none');
  }

  async function shoot() {
    try {
      const uri = await takePhoto();
      if (uri) setPhoto(uri);
    } catch (e) {
      Alert.alert('Kamera', (e as Error).message);
    }
  }

  if (!scan) {
    return <View style={{ padding: 16 }}><Banner kind="error" text="Avval QR kodni skanerlang" /><Button title="Skanerlash" onPress={() => router.replace('/scan')} /></View>;
  }
  const d = scan.delivery;
  const needPhoto = cfg?.require_delivery_photo ?? true;
  const needGps = cfg?.require_delivery_gps ?? true;
  const canSubmit = (!needPhoto || !!photo) && (!needGps || !!gps);

  async function submit() {
    setBusy(true);
    setError('');
    const form = new FormData();
    form.append('scan_id', String(scan!.scan_id));
    form.append('client_request_id', requestId);
    form.append('device_time', deviceTime());
    if (note.trim()) form.append('note', note.trim());
    if (gps) {
      form.append('latitude', String(gps.latitude));
      form.append('longitude', String(gps.longitude));
      if (gps.accuracy !== null) form.append('accuracy', String(Math.round(gps.accuracy)));
    }
    if (photo) form.append('photo', filePart(photo));
    try {
      const r = await api.upload<AttemptResult>('/driver/deliver', form);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setLastScan(null);
      Alert.alert('✓ Yetkazildi', `№ ${r.data.invoice_number} muvaffaqiyatli yetkazildi.`, [
        { text: 'OK', onPress: () => router.dismissTo('/') },
      ]);
    } catch (e) {
      const err = e as ApiError;
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(err.isNetwork ? `${err.message}. Tugmani qayta bosing — ikki marta saqlanmaydi.` : err.message);
      if (err.code === 'already_delivered') setLastScan(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Card style={{ borderColor: C.ok, borderWidth: 2 }}>
        <Text style={[s.muted, { color: C.ok, fontWeight: '800' }]}>✓ QR TO'G'RI — SIZNING YUKINGIZ</Text>
        <Text style={[s.h1, { marginTop: 4 }]}>№ {d.invoice_number}</Text>
        <Text style={st.ph}>{d.pharmacy_name}</Text>
        <Text style={st.addr}>{d.delivery_address}</Text>
        <Text style={s.muted}>{d.region_name}{d.package_count ? ` · 📦 ${d.package_count} ta qadoq` : ''}{d.pharmacy_phone ? ` · ☎ ${phone(d.pharmacy_phone)}` : ''}</Text>
      </Card>

      <Card>
        <Text style={st.step}>1. Rasm {needPhoto ? '(majburiy)' : '(ixtiyoriy)'}</Text>
        {photo ? <Image source={{ uri: photo }} style={st.photo} resizeMode="cover" /> : null}
        <Button title={photo ? 'Qayta rasmga olish' : 'Rasmga olish'} icon="📷" variant={photo ? 'outline' : 'primary'} onPress={shoot} />
      </Card>

      <Card>
        <Text style={st.step}>2. Joylashuv (GPS)</Text>
        {gpsState === 'loading' ? <Text style={s.muted}>Aniqlanmoqda…</Text> : null}
        {gpsState === 'ok' && gps ? <Text style={{ color: C.ok, fontWeight: '700' }}>✓ Aniqlandi (±{Math.round(gps.accuracy ?? 0)} m)</Text> : null}
        {gpsState === 'none' ? (
          <View style={{ gap: 8 }}>
            <Text style={{ color: C.danger, fontWeight: '700' }}>GPS aniqlanmadi — telefonda joylashuvni yoqing</Text>
            <Button title="Qayta aniqlash" variant="outline" onPress={locate} />
          </View>
        ) : null}
      </Card>

      <Card>
        <Text style={st.step}>3. Izoh (ixtiyoriy)</Text>
        <TextInput style={st.input} value={note} onChangeText={setNote} placeholder="Masalan: farmatsevtga topshirildi" multiline maxLength={1000} />
      </Card>

      {error ? <Banner kind="error" text={error} /> : null}
      <Button title="YETKAZILDI" big variant="success" onPress={submit} loading={busy} disabled={!canSubmit} />
      {!canSubmit ? <Text style={[s.muted, { textAlign: 'center' }]}>{needPhoto && !photo ? 'Avval rasmga oling' : 'GPS aniqlanishini kuting'}</Text> : null}
      <Button title="Yetkazib bo'lmadi" variant="outline" onPress={() => router.replace({ pathname: '/fail/[id]', params: { id: String(d.id) } })} />
    </ScrollView>
  );
}

const st = StyleSheet.create({
  ph: { fontSize: 17, fontWeight: '700', color: C.text, marginTop: 6 },
  addr: { fontSize: 14.5, color: C.text2, marginVertical: 3, lineHeight: 20 },
  step: { fontSize: 15, fontWeight: '800', color: C.text, marginBottom: 10 },
  photo: { width: '100%', height: 220, borderRadius: 12, marginBottom: 10, backgroundColor: '#eee' },
  input: { minHeight: 64, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, fontSize: 15, color: C.text, textAlignVertical: 'top' },
});

import { useEffect, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, ApiError, type AppConfig, type AttemptResult } from '../lib/api';
import { appConfig, getLastScan, setLastScan } from '../lib/session';
import { filePart, getGps, takePhoto, type Gps } from '../lib/device';
import { deviceTime } from '../lib/format';
import { GradientHeader } from '../components/GradientHeader';
import { SwipeButton } from '../components/SwipeButton';
import { useToast } from '../components/Toast';
import { Button, Card, Icon, Notice, T, Tap } from '../components/kit';
import { colors, font, radius, shadow, space } from '../theme';

/**
 * Last step: photo + GPS → swipe "Yetkazildi".
 * client_request_id is created ONCE per screen, so retrying after a network
 * error can never create a second delivery.
 */
export default function Confirm() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
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
      toast.show((e as Error).message, 'error');
    }
  }

  if (!scan) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <GradientHeader back title="Tasdiqlash" />
        <View style={{ padding: space.lg, gap: space.md }}>
          <Notice kind="error" text="Avval yukdagi QR kodni skanerlang" />
          <Button title="Skanerlash" icon="scan-outline" onPress={() => router.replace('/scan')} />
        </View>
      </View>
    );
  }
  const d = scan.delivery;
  const needPhoto = cfg?.require_delivery_photo ?? true;
  const needGps = cfg?.require_delivery_gps ?? true;
  const photoOk = !needPhoto || !!photo;
  const gpsOk = !needGps || !!gps;
  const ready = photoOk && gpsOk;

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
      setLastScan(null);
      router.replace({ pathname: '/success', params: { result: 'delivered', number: r.data.invoice_number, pharmacy: d.pharmacy_name } });
    } catch (e) {
      const err = e as ApiError;
      setError(err.isNetwork ? `${err.message}. Qayta suring — ikki marta saqlanmaydi.` : err.message);
      if (err.code === 'already_delivered') setLastScan(null);
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <GradientHeader back title="Yetkazishni tasdiqlash" subtitle={`№ ${d.invoice_number}`} extend={40} />
      <ScrollView style={{ marginTop: -40 }} contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: 170, gap: space.md }} keyboardShouldPersistTaps="handled">
        {/* Verified parcel */}
        <Card style={[shadow(2), { borderColor: '#BFE7CB', borderWidth: 1.5 }]}>
          <View style={st.verified}>
            <Icon name="shield-checkmark" size={16} color={colors.success} />
            <T v="caption" color={colors.success}>QR tasdiqlandi — sizning yukingiz</T>
          </View>
          <T v="h2" style={{ marginTop: 8 }}>{d.pharmacy_name}</T>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
            <Icon name="location-outline" size={16} color={colors.text3} />
            <T v="body" style={{ flex: 1, fontSize: 14, lineHeight: 20 }}>{d.delivery_address}</T>
          </View>
          {d.package_count ? (
            <View style={st.pkg}><Icon name="cube" size={16} color={colors.brand} /><T v="bodyStrong" color={colors.brand}>{d.package_count} ta qadoqni topshiring</T></View>
          ) : null}
        </Card>

        {/* Step 1: photo */}
        <Step n={1} done={!!photo} title="Tasdiq rasmi" hint={needPhoto ? 'Majburiy' : 'Ixtiyoriy'}>
          {photo ? (
            <View>
              <Image source={{ uri: photo }} style={st.photo} />
              <Tap onPress={shoot} style={st.retake}><Icon name="camera-reverse-outline" size={16} color="#fff" /><T v="small" color="#fff">Qayta olish</T></Tap>
            </View>
          ) : (
            <Tap onPress={shoot} style={st.photoEmpty}>
              <View style={st.camCircle}><Icon name="camera" size={30} color={colors.brand} /></View>
              <T v="h3" color={colors.brand}>Rasmga olish</T>
              <T v="small">Yuk va dorixona ko'rinsin</T>
            </Tap>
          )}
        </Step>

        {/* Step 2: GPS */}
        <Step n={2} done={gpsState === 'ok'} title="Joylashuv" hint={needGps ? 'Majburiy' : 'Ixtiyoriy'}>
          <View style={st.gpsRow}>
            <View style={[st.gpsIcon, { backgroundColor: gpsState === 'none' ? colors.dangerSoft : colors.brandSoft }]}>
              <Icon name={gpsState === 'none' ? 'location-outline' : 'locate'} size={22} color={gpsState === 'none' ? colors.danger : colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              {gpsState === 'loading' ? <><T v="bodyStrong">Aniqlanmoqda…</T><T v="small">Bir necha soniya</T></> : null}
              {gpsState === 'ok' && gps ? <><T v="bodyStrong" color={colors.success}>Joylashuv aniqlandi</T><T v="small">Aniqlik ±{Math.round(gps.accuracy ?? 0)} m</T></> : null}
              {gpsState === 'none' ? <><T v="bodyStrong" color={colors.danger}>GPS aniqlanmadi</T><T v="small">Telefonda joylashuvni yoqing</T></> : null}
            </View>
            {gpsState !== 'loading' ? <Button title="Yangilash" size="sm" variant="secondary" icon="refresh" onPress={locate} /> : null}
          </View>
        </Step>

        {/* Step 3: note */}
        <Step n={3} done={note.trim().length > 0} title="Izoh" hint="Ixtiyoriy">
          <TextInput style={st.input} value={note} onChangeText={setNote} placeholder="Masalan: farmatsevt Dilnozaga topshirildi"
            placeholderTextColor={colors.text3} multiline maxLength={1000} />
        </Step>

        <Tap onPress={() => router.replace({ pathname: '/fail/[id]', params: { id: String(d.id) } })} style={st.failLink}>
          <Icon name="alert-circle-outline" size={18} color={colors.danger} />
          <T v="bodyStrong" color={colors.danger}>Yetkazib bo'lmadimi? Sababini belgilang</T>
        </Tap>
      </ScrollView>

      <View style={[st.bottom, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        {error ? <View style={{ marginBottom: space.md }}><Notice kind="error" text={error} /></View> : null}
        {!ready ? (
          <T v="small" style={{ textAlign: 'center', marginBottom: 8 }}>
            {!photoOk ? '1-qadam: avval rasmga oling' : 'GPS aniqlanishini kuting'}
          </T>
        ) : null}
        <SwipeButton label="Suring — Yetkazildi" onConfirm={submit} disabled={!ready} loading={busy} />
      </View>
    </View>
  );
}

function Step({ n, title, hint, done, children }: { n: number; title: string; hint: string; done: boolean; children: React.ReactNode }) {
  return (
    <Card>
      <View style={st.stepHead}>
        <View style={[st.stepNum, done && { backgroundColor: colors.success, borderColor: colors.success }]}>
          {done ? <Icon name="checkmark" size={16} color="#fff" /> : <T v="bodyStrong" color={colors.brand} style={{ fontSize: 13 }}>{n}</T>}
        </View>
        <T v="h3" style={{ flex: 1 }}>{title}</T>
        <T v="small">{hint}</T>
      </View>
      {children}
    </Card>
  );
}

const st = StyleSheet.create({
  verified: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pkg: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.brandSoft, borderRadius: radius.sm, padding: 10, marginTop: space.md },
  stepHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: space.md },
  stepNum: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  photoEmpty: { height: 170, borderRadius: radius.md, borderWidth: 2, borderStyle: 'dashed', borderColor: '#9FD3CC', backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center', gap: 4 },
  camCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 6, ...shadow(1) },
  photo: { width: '100%', height: 220, borderRadius: radius.md, backgroundColor: '#eee' },
  retake: { position: 'absolute', right: 10, bottom: 10, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 99 },
  gpsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  gpsIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  input: { minHeight: 70, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: 12, fontFamily: font.medium, fontSize: 15, color: colors.text, textAlignVertical: 'top' },
  failLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.lg, paddingTop: 12, backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, ...shadow(3) },
});

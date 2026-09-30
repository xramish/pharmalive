import { useEffect, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, ApiError, type AttemptResult, type Delivery, type FailureReason } from '../../lib/api';
import { failureReasons, setLastScan } from '../../lib/session';
import { filePart, getGps, takePhoto, type Gps } from '../../lib/device';
import { deviceTime } from '../../lib/format';
import { GradientHeader } from '../../components/GradientHeader';
import { useToast } from '../../components/Toast';
import { Button, Card, Icon, McIcon, Notice, SectionTitle, T, Tap, type McIconName } from '../../components/kit';
import { colors, font, radius, space } from '../../theme';

/** Icon per failure reason code (falls back to a generic icon for new reasons). */
const REASON_ICON: Record<string, McIconName> = {
  receiver_unavailable: 'account-off-outline',
  closed: 'store-remove-outline',
  wrong_address: 'map-marker-question-outline',
  refused: 'hand-back-left-outline',
  damaged: 'package-variant-remove',
  other: 'dots-horizontal-circle-outline',
};

export default function FailDelivery() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const requestId = useRef(Crypto.randomUUID()).current;
  const [d, setD] = useState<Delivery | null>(null);
  const [reasons, setReasons] = useState<FailureReason[]>([]);
  const [reasonId, setReasonId] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [gps, setGps] = useState<Gps | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Delivery>(`/driver/deliveries/${id}`).then((r) => setD(r.data)).catch((e) => setError((e as Error).message));
    failureReasons().then(setReasons).catch((e) => setError((e as Error).message));
    void getGps().then(setGps);
  }, [id]);

  const reason = reasons.find((r) => r.id === reasonId);
  const needComment = !!reason && !!Number(reason.requires_comment);
  const canSubmit = !!reason && (!needComment || comment.trim().length > 0);

  async function submit() {
    setBusy(true);
    setError('');
    const form = new FormData();
    form.append('invoice_id', String(id));
    form.append('reason_id', String(reasonId));
    form.append('client_request_id', requestId);
    form.append('device_time', deviceTime());
    if (comment.trim()) form.append('comment', comment.trim());
    const g = gps ?? (await getGps());
    if (g) {
      form.append('latitude', String(g.latitude));
      form.append('longitude', String(g.longitude));
      if (g.accuracy !== null) form.append('accuracy', String(Math.round(g.accuracy)));
    }
    if (photo) form.append('photo', filePart(photo));
    try {
      const r = await api.upload<AttemptResult>('/driver/fail', form);
      setLastScan(null);
      router.replace({ pathname: '/success', params: { result: 'failed', number: r.data.invoice_number, pharmacy: d?.pharmacy_name ?? '', reason: reason?.name ?? '' } });
    } catch (e) {
      const err = e as ApiError;
      setError(err.isNetwork ? `${err.message}. Qayta bosing — ikki marta saqlanmaydi.` : err.message);
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <GradientHeader back title="Yetkazib bo'lmadi" subtitle={d ? `№ ${d.invoice_number} · ${d.pharmacy_name}` : undefined} />
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: 140, gap: space.lg }} keyboardShouldPersistTaps="handled">
        <View>
          <SectionTitle>Nima bo'ldi?</SectionTitle>
          <View style={st.grid}>
            {reasons.map((r) => {
              const on = r.id === reasonId;
              return (
                <Tap key={r.id} onPress={() => setReasonId(r.id)} style={[st.reason, on && st.reasonOn]}>
                  <View style={[st.reasonIcon, on && { backgroundColor: colors.danger }]}>
                    <McIcon name={REASON_ICON[r.code] ?? 'alert-circle-outline'} size={24} color={on ? '#fff' : colors.danger} />
                  </View>
                  <T v="bodyStrong" style={{ fontSize: 14, textAlign: 'center', lineHeight: 19 }} color={on ? colors.danger : colors.text}>{r.name}</T>
                  {on ? <View style={st.check}><Icon name="checkmark" size={13} color="#fff" /></View> : null}
                </Tap>
              );
            })}
          </View>
        </View>

        <View>
          <SectionTitle>{needComment ? 'Izoh (majburiy)' : 'Izoh (ixtiyoriy)'}</SectionTitle>
          <TextInput style={[st.input, needComment && !comment.trim() && { borderColor: '#F5C2C2' }]} value={comment} onChangeText={setComment}
            multiline maxLength={1000} placeholder="Batafsil yozing: kim bilan gaplashdingiz, nima dedi…" placeholderTextColor={colors.text3} />
        </View>

        <View>
          <SectionTitle>Rasm (ixtiyoriy)</SectionTitle>
          {photo ? (
            <Card pad={false} style={{ overflow: 'hidden' }}>
              <Image source={{ uri: photo }} style={{ width: '100%', height: 180 }} />
              <Tap onPress={() => setPhoto(null)} style={st.remove}><Icon name="trash-outline" size={16} color="#fff" /></Tap>
            </Card>
          ) : (
            <Button title="Rasmga olish" icon="camera-outline" variant="secondary"
              onPress={() => takePhoto().then((u) => u && setPhoto(u)).catch((e) => toast.show((e as Error).message, 'error'))} />
          )}
        </View>

        <View style={st.gpsLine}>
          <Icon name={gps ? 'locate' : 'location-outline'} size={16} color={gps ? colors.success : colors.text3} />
          <T v="small" color={gps ? colors.success : colors.text3}>{gps ? `Joylashuv qo'shiladi (±${Math.round(gps.accuracy ?? 0)} m)` : 'Joylashuv aniqlanmoqda…'}</T>
        </View>
      </ScrollView>

      <View style={[st.bottom, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        {error ? <View style={{ marginBottom: space.md }}><Notice kind="error" text={error} /></View> : null}
        <Button title={reason ? `Yuborish: ${reason.name}` : 'Sababni tanlang'} icon="send" variant="danger" size="lg" onPress={submit} loading={busy} disabled={!canSubmit} />
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  reason: { width: '48%', flexGrow: 1, alignItems: 'center', gap: 8, paddingVertical: 16, paddingHorizontal: 10, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  reasonOn: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  reasonIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.dangerSoft, alignItems: 'center', justifyContent: 'center' },
  check: { position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  input: { minHeight: 90, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: radius.md, padding: 12, fontFamily: font.medium, fontSize: 15, color: colors.text, textAlignVertical: 'top' },
  remove: { position: 'absolute', top: 10, right: 10, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  gpsLine: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.lg, paddingTop: 12, backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
});

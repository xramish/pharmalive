import { useEffect, useRef, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import { router, useLocalSearchParams } from 'expo-router';
import { api, ApiError, type AttemptResult, type Delivery, type FailureReason } from '../../lib/api';
import { failureReasons, setLastScan } from '../../lib/session';
import { filePart, getGps, takePhoto, type Gps } from '../../lib/device';
import { deviceTime } from '../../lib/format';
import { Banner, Button, C, Card, s } from '../../components/ui';

export default function FailDelivery() {
  const { id } = useLocalSearchParams<{ id: string }>();
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
      await api.upload<AttemptResult>('/driver/fail', form);
      setLastScan(null);
      Alert.alert('Qayd etildi', 'Dispetcherga xabar boradi. Yukni omborga qaytaring yoki dispetcher ko\'rsatmasini kuting.', [
        { text: 'OK', onPress: () => router.dismissTo('/') },
      ]);
    } catch (e) {
      const err = e as ApiError;
      setError(err.isNetwork ? `${err.message}. Qayta bosing — ikki marta saqlanmaydi.` : err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      {d ? (
        <Card>
          <Text style={s.h1}>№ {d.invoice_number}</Text>
          <Text style={{ fontSize: 16, fontWeight: '700', color: C.text, marginTop: 4 }}>{d.pharmacy_name}</Text>
        </Card>
      ) : null}

      <Card>
        <Text style={st.step}>Sabab</Text>
        {reasons.map((r) => (
          <Pressable key={r.id} onPress={() => setReasonId(r.id)} style={[st.reason, reasonId === r.id && st.reasonOn]}>
            <View style={[st.radio, reasonId === r.id && st.radioOn]} />
            <Text style={st.reasonText}>{r.name}</Text>
          </Pressable>
        ))}
      </Card>

      <Card>
        <Text style={st.step}>Izoh {needComment ? '(majburiy)' : '(ixtiyoriy)'}</Text>
        <TextInput style={st.input} value={comment} onChangeText={setComment} multiline maxLength={1000} placeholder="Nima bo'ldi?" />
      </Card>

      <Card>
        <Text style={st.step}>Rasm (ixtiyoriy)</Text>
        {photo ? <Image source={{ uri: photo }} style={st.photo} /> : null}
        <Button title={photo ? 'Qayta rasmga olish' : 'Rasmga olish'} icon="📷" variant="outline"
          onPress={() => takePhoto().then((u) => u && setPhoto(u)).catch((e) => Alert.alert('Kamera', (e as Error).message))} />
      </Card>

      {error ? <Banner kind="error" text={error} /> : null}
      <Button title="Yetkazilmadi deb belgilash" big variant="danger" onPress={submit} loading={busy} disabled={!canSubmit} />
    </ScrollView>
  );
}

const st = StyleSheet.create({
  step: { fontSize: 15, fontWeight: '800', color: C.text, marginBottom: 8 },
  reason: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 10, borderRadius: 10 },
  reasonOn: { backgroundColor: C.dangerSoft },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: C.border },
  radioOn: { borderColor: C.danger, backgroundColor: C.danger },
  reasonText: { fontSize: 16, color: C.text },
  input: { minHeight: 70, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, fontSize: 15, color: C.text, textAlignVertical: 'top' },
  photo: { width: '100%', height: 200, borderRadius: 12, marginBottom: 10 },
});

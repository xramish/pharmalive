import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { api, type Delivery } from '../../lib/api';
import { callPhone, date, openMap, phone } from '../../lib/format';
import { Banner, Button, C, Card, Row, StatusChip, s } from '../../components/ui';

export default function DeliveryDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [d, setD] = useState<Delivery | null>(null);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      api.get<Delivery>(`/driver/deliveries/${id}`)
        .then((r) => { setD(r.data); setError(''); })
        .catch((e) => setError((e as Error).message));
    }, [id]),
  );

  if (!d) {
    return <View style={{ padding: 16 }}>{error ? <Banner kind="error" text={error} /> : <Text style={s.muted}>Yuklanmoqda…</Text>}</View>;
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: 40 }}>
      <Stack.Screen options={{ title: `№ ${d.invoice_number}` }} />
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={s.h1}>№ {d.invoice_number}</Text>
          <StatusChip status={d.status} label={d.status_label} />
        </View>
        <Text style={{ fontSize: 18, fontWeight: '700', marginTop: 10, color: C.text }}>{d.pharmacy_name}</Text>
        <Text style={{ fontSize: 15, color: C.text2, marginTop: 4, lineHeight: 21 }}>{d.delivery_address}</Text>
        <Text style={[s.muted, { marginTop: 4 }]}>{d.region_name}</Text>
      </Card>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button title="Qo'ng'iroq" icon="☎" variant="outline" style={{ flex: 1 }} disabled={!d.pharmacy_phone} onPress={() => callPhone(d.pharmacy_phone)} />
        <Button title="Xarita" icon="➤" variant="outline" style={{ flex: 1 }} onPress={() => openMap(d.latitude, d.longitude, d.delivery_address)} />
      </View>

      <Card>
        <Row label="Telefon" value={phone(d.pharmacy_phone) || "yo'q"} onPress={d.pharmacy_phone ? () => callPhone(d.pharmacy_phone) : undefined} />
        <Row label="Mas'ul" value={d.pharmacy_contact ?? ''} />
        <Row label="Qadoqlar" value={d.package_count ? `${d.package_count} ta` : ''} />
        <Row label="Jo'natuvchi" value={d.company_name} />
        <Row label="Sana" value={date(d.invoice_date)} />
        <Row label="Reja" value={date(d.planned_date)} />
        {d.notes ? <Row label="Izoh" value={d.notes} /> : null}
      </Card>

      {d.status === 'assigned' ? <Banner kind="info" text="Yuk olganingizda bosh sahifada «Yo'lga chiqish» ni bosing." /> : null}

      <Button title="YETKAZILDI — QR skanerlash" big variant="success" onPress={() => router.push('/scan')} />
      <Button title="Yetkazib bo'lmadi" variant="outline" onPress={() => router.push({ pathname: '/fail/[id]', params: { id: String(d.id) } })} />
    </ScrollView>
  );
}

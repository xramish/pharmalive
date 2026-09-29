import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router, Stack, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, ApiError, APP_VERSION, type Delivery, type Summary } from '../lib/api';
import { appConfig } from '../lib/session';
import { getGps } from '../lib/device';
import { compareVersions, date, phone } from '../lib/format';
import { Banner, Button, C, Card, StatusChip, s } from '../components/ui';

export default function Deliveries() {
  const [items, setItems] = useState<Delivery[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  const [outdated, setOutdated] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get<Delivery[]>('/driver/deliveries');
      setItems(r.data);
      setSummary((r.meta?.summary as Summary) ?? null);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
      appConfig()
        .then((c) => setOutdated(compareVersions(APP_VERSION, c.android_min_version) < 0))
        .catch(() => undefined);
    }, [load]),
  );

  const assigned = items.filter((d) => d.status === 'assigned').length;

  async function startTrip() {
    setStarting(true);
    try {
      const gps = await getGps();
      const r = await api.post<{ started: number }>('/driver/start', gps ? { ...gps } : {});
      Alert.alert('Yo\'lga chiqdingiz', `${r.data.started} ta yuk "Yo'lda" holatiga o'tdi. Oq yo'l!`);
      await load();
    } catch (e) {
      Alert.alert('Xatolik', (e as ApiError).message);
    } finally {
      setStarting(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 18 }}>
              <Pressable onPress={() => router.push('/history')} hitSlop={10}><Text style={st.headerBtn}>Tarix</Text></Pressable>
              <Pressable onPress={() => router.push('/profile')} hitSlop={10}><Text style={st.headerBtn}>Profil</Text></Pressable>
            </View>
          ),
        }}
      />
      <FlatList
        data={items}
        keyExtractor={(d) => String(d.id)}
        contentContainerStyle={{ padding: 14, paddingBottom: 110, gap: 10 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} colors={[C.primary]} />}
        ListHeaderComponent={
          <View style={{ gap: 10 }}>
            {outdated ? <Banner kind="warn" text="Ilovaning yangi versiyasi bor. Iltimos, yangilang." /> : null}
            {error ? <Banner kind="error" text={error} /> : null}
            {summary ? (
              <View style={st.stats}>
                <Stat n={summary.assigned} label="Biriktirilgan" color={C.violet} />
                <Stat n={summary.on_the_way} label="Yo'lda" color={C.warn} />
                <Stat n={summary.delivered_today} label="Bugun yetkazildi" color={C.ok} />
              </View>
            ) : null}
            {assigned > 0 ? (
              <Button title={`Yo'lga chiqish (${assigned} ta yuk)`} icon="🚚" onPress={startTrip} loading={starting} />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={{ alignItems: 'center', padding: 40 }}>
              <Text style={{ fontSize: 40 }}>📦</Text>
              <Text style={[s.muted, { fontSize: 16, textAlign: 'center', marginTop: 8 }]}>
                Hozircha sizga biriktirilgan yuk yo'q.{'\n'}Pastga torting — yangilanadi.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Card onPress={() => router.push({ pathname: '/delivery/[id]', params: { id: String(item.id) } })}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <Text style={st.num}>№ {item.invoice_number}</Text>
              <StatusChip status={item.status} label={item.status_label} />
            </View>
            <Text style={st.pharmacy}>{item.pharmacy_name}</Text>
            <Text style={st.addr} numberOfLines={2}>{item.delivery_address}</Text>
            <View style={st.meta}>
              <Text style={s.muted}>{item.region_name}</Text>
              {item.package_count ? <Text style={st.pk}>📦 {item.package_count}</Text> : null}
              {item.planned_date ? <Text style={s.muted}>📅 {date(item.planned_date)}</Text> : null}
              {item.pharmacy_phone ? <Text style={s.muted}>☎ {phone(item.pharmacy_phone)}</Text> : null}
            </View>
          </Card>
        )}
      />
      <View style={st.fab}>
        <Button title="QR skanerlash" icon="▣" big onPress={() => router.push('/scan')} disabled={items.length === 0} />
      </View>
    </SafeAreaView>
  );
}

function Stat({ n, label, color }: { n: number; label: string; color: string }) {
  return (
    <View style={st.stat}>
      <Text style={[st.statN, { color }]}>{n}</Text>
      <Text style={st.statL}>{label}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  headerBtn: { color: '#bfe6e1', fontSize: 15, fontWeight: '700' },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 10 },
  statN: { fontSize: 24, fontWeight: '800' },
  statL: { fontSize: 12, color: C.text3 },
  num: { fontSize: 18, fontWeight: '800', color: C.text },
  pharmacy: { fontSize: 16, fontWeight: '700', color: C.text, marginTop: 6 },
  addr: { fontSize: 14, color: C.text2, marginTop: 2 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  pk: { fontSize: 13, color: C.text, fontWeight: '700' },
  fab: { position: 'absolute', left: 14, right: 14, bottom: 18 },
});

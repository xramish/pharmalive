import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api, type HistoryItem } from '../lib/api';
import { date, time } from '../lib/format';
import { Banner, C, Card, StatusChip, s } from '../components/ui';

export default function History() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems((await api.get<HistoryItem[]>('/driver/deliveries?scope=history')).data);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return (
    <FlatList
      data={items}
      keyExtractor={(i) => String(i.attempt_id)}
      contentContainerStyle={{ padding: 14, gap: 8 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} colors={[C.primary]} />}
      ListHeaderComponent={error ? <Banner kind="error" text={error} /> : null}
      ListEmptyComponent={!loading ? <Text style={[s.muted, { textAlign: 'center', padding: 30 }]}>Oxirgi 30 kunda yetkazish yo'q</Text> : null}
      renderItem={({ item }) => (
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: C.text }}>№ {item.invoice_number}</Text>
            <StatusChip status={item.result} label={item.result === 'delivered' ? 'Yetkazildi' : 'Yetkazilmadi'} />
          </View>
          <Text style={{ fontSize: 15, color: C.text, marginTop: 4 }}>{item.pharmacy_name}</Text>
          <Text style={s.muted}>{date(item.created_at)} {time(item.created_at)} · {item.region_name}</Text>
          {item.failure_reason ? <Text style={{ color: C.danger, marginTop: 4 }}>{item.failure_reason}{item.comment ? `: ${item.comment}` : ''}</Text> : null}
        </Card>
      )}
    />
  );
}

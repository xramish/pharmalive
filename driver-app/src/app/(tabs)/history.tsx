import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, SectionList, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api, type HistoryItem } from '../../lib/api';
import { dayLabel, time } from '../../lib/format';
import { GradientHeader } from '../../components/GradientHeader';
import { Card, DeliverySkeleton, EmptyState, Icon, Notice, T } from '../../components/kit';
import { colors, radius, space } from '../../theme';

export default function History() {
  const [items, setItems] = useState<HistoryItem[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setItems((await api.get<HistoryItem[]>('/driver/deliveries?scope=history')).data);
      setError('');
    } catch (e) {
      setError((e as Error).message);
      setItems((p) => p ?? []);
    }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const sections = useMemo(() => {
    const map = new Map<string, HistoryItem[]>();
    (items ?? []).forEach((i) => {
      const k = i.created_at.slice(0, 10);
      map.set(k, [...(map.get(k) ?? []), i]);
    });
    return [...map.entries()].map(([k, data]) => ({ title: dayLabel(k), data, ok: data.filter((d) => d.result === 'delivered').length }));
  }, [items]);

  const delivered = items?.filter((i) => i.result === 'delivered').length ?? 0;
  const failed = (items?.length ?? 0) - delivered;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <GradientHeader title="Tarix" subtitle="Oxirgi 30 kun">
        <View style={st.totals}>
          <Total icon="checkmark-circle" n={delivered} label="Yetkazildi" color={colors.mint} />
          <View style={st.vsep} />
          <Total icon="close-circle" n={failed} label="Yetkazilmadi" color="#FCA5A5" />
        </View>
      </GradientHeader>
      <SectionList
        sections={sections}
        keyExtractor={(i) => String(i.attempt_id)}
        contentContainerStyle={{ padding: space.lg, paddingBottom: 30 }}
        stickySectionHeadersEnabled={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} colors={[colors.brand]} />}
        ListHeaderComponent={error ? <View style={{ marginBottom: space.md }}><Notice kind="error" text={error} /></View> : null}
        ListEmptyComponent={items === null
          ? <View style={{ gap: space.md }}><DeliverySkeleton /><DeliverySkeleton /></View>
          : <EmptyState icon="time-outline" title="Tarix bo'sh" text="Yetkazgan yuklaringiz shu yerda ko'rinadi." />}
        renderSectionHeader={({ section }) => (
          <View style={st.secHead}>
            <T v="h3">{section.title}</T>
            <T v="small">{section.ok} / {section.data.length} yetkazildi</T>
          </View>
        )}
        renderItem={({ item, index, section }) => {
          const ok = item.result === 'delivered';
          const first = index === 0;
          const last = index === section.data.length - 1;
          return (
            <Card pad={false} style={[st.row, !first && st.joinTop, !last && st.joinBottom]}>
              <View style={[st.dot, { backgroundColor: ok ? colors.successSoft : colors.dangerSoft }]}>
                <Icon name={ok ? 'checkmark' : 'close'} size={20} color={ok ? colors.success : colors.danger} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <T v="bodyStrong">№ {item.invoice_number}</T>
                  <T v="small">{time(item.created_at)}</T>
                </View>
                <T v="body" numberOfLines={1} style={{ fontSize: 14 }}>{item.pharmacy_name}</T>
                {item.failure_reason ? (
                  <T v="small" color={colors.danger} numberOfLines={2}>{item.failure_reason}{item.comment ? ` — ${item.comment}` : ''}</T>
                ) : null}
              </View>
            </Card>
          );
        }}
      />
    </View>
  );
}

function Total({ icon, n, label, color }: { icon: 'checkmark-circle' | 'close-circle'; n: number; label: string; color: string }) {
  return (
    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Icon name={icon} size={26} color={color} />
      <View>
        <T v="h1" color="#fff">{n}</T>
        <T v="small" color={colors.onBrandMuted}>{label}</T>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  totals: { flexDirection: 'row', alignItems: 'center', marginTop: space.lg, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: radius.md, padding: space.md },
  vsep: { width: 1, height: 34, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: space.md },
  secHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: space.md, marginBottom: space.sm },
  row: { flexDirection: 'row', gap: 12, padding: 14, alignItems: 'flex-start' },
  joinTop: { borderTopLeftRadius: 4, borderTopRightRadius: 4, marginTop: -1 },
  joinBottom: { borderBottomLeftRadius: 4, borderBottomRightRadius: 4 },
  dot: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
});

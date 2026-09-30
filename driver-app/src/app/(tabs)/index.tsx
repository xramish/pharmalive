import { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { api, ApiError, APP_VERSION, type Delivery, type Summary } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { appConfig } from '../../lib/session';
import { getGps } from '../../lib/device';
import { callPhone, compareVersions, date, firstName, greeting, initials, openMap, todayLong } from '../../lib/format';
import { GradientHeader } from '../../components/GradientHeader';
import { useToast } from '../../components/Toast';
import {
  Button, Card, Chip, DeliverySkeleton, EmptyState, Icon, IconButton, McIcon, Notice, StatusPill, T, Tap,
} from '../../components/kit';
import { colors, radius, shadow, space, statusStyle } from '../../theme';

type Filter = 'all' | 'on_the_way' | 'assigned';

export default function Home() {
  const { user } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState<Delivery[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  const [outdated, setOutdated] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');

  const load = useCallback(async () => {
    try {
      const r = await api.get<Delivery[]>('/driver/deliveries');
      setItems(r.data);
      setSummary((r.meta?.summary as Summary) ?? null);
      setError('');
    } catch (e) {
      setError((e as Error).message);
      setItems((prev) => prev ?? []);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
      appConfig().then((c) => setOutdated(compareVersions(APP_VERSION, c.android_min_version) < 0)).catch(() => undefined);
    }, [load]),
  );

  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const counts = useMemo(() => ({
    all: items?.length ?? 0,
    on_the_way: items?.filter((d) => d.status === 'on_the_way').length ?? 0,
    assigned: items?.filter((d) => d.status === 'assigned').length ?? 0,
  }), [items]);
  const visible = (items ?? []).filter((d) => filter === 'all' || d.status === filter);

  const done = summary?.delivered_today ?? 0;
  const total = done + (summary?.assigned ?? 0) + (summary?.on_the_way ?? 0) + (summary?.failed_today ?? 0);
  const pct = total > 0 ? done / total : 0;

  async function startTrip() {
    setStarting(true);
    try {
      const gps = await getGps();
      const r = await api.post<{ started: number }>('/driver/start', gps ? { ...gps } : {});
      toast.show(`${r.data.started} ta yuk yo'lga chiqdi. Oq yo'l!`, 'ok');
      await load();
    } catch (e) {
      toast.show((e as ApiError).message, 'error');
    } finally {
      setStarting(false);
    }
  }

  const header = (
    <View>
      <GradientHeader extend={62}>
        <View style={st.topRow}>
          <View style={{ flex: 1 }}>
            <T v="small" color={colors.onBrandMuted}>{todayLong()}</T>
            <T v="h1" color="#fff" style={{ marginTop: 2 }}>{greeting()}, {firstName(user?.full_name)}</T>
          </View>
          <Tap onPress={() => router.push('/profile')} accessibilityLabel="Profil" style={st.avatar}>
            <T v="h3" color="#fff">{initials(user?.full_name)}</T>
          </Tap>
        </View>
      </GradientHeader>

      {/* Today's progress card overlapping the header */}
      <View style={{ paddingHorizontal: space.lg, marginTop: -62 }}>
        <Card style={shadow(2)}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <View>
              <T v="caption">Bugungi natija</T>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                <T v="display" color={colors.brand}>{done}</T>
                <T v="h3" color={colors.text3}>/ {total}</T>
              </View>
            </View>
            <T v="small">{total ? `${Math.round(pct * 100)}% bajarildi` : 'Yuk kutilmoqda'}</T>
          </View>
          <View style={st.progress}><View style={[st.progressFill, { width: `${Math.round(pct * 100)}%` }]} /></View>
          <View style={st.statsRow}>
            <Stat icon="cube-outline" n={summary?.assigned ?? 0} label="Olish kerak" color={colors.violet} />
            <Stat icon="navigate-outline" n={summary?.on_the_way ?? 0} label="Yo'lda" color={colors.warning} />
            <Stat icon="checkmark-circle" n={done} label="Yetkazildi" color={colors.success} />
            <Stat icon="close-circle" n={summary?.failed_today ?? 0} label="Muammo" color={colors.danger} />
          </View>
        </Card>
      </View>

      <View style={{ paddingHorizontal: space.lg, gap: space.md, marginTop: space.md }}>
        {outdated ? <Notice kind="warn" text="Ilovaning yangi versiyasi chiqdi. Iltimos, yangilang." /> : null}
        {error ? <Notice kind="error" text={error} icon="cloud-offline-outline" /> : null}

        {counts.assigned > 0 ? (
          <Card style={st.startCard}>
            <View style={st.startIcon}><McIcon name="truck-fast-outline" size={30} color={colors.violet} /></View>
            <View style={{ flex: 1 }}>
              <T v="h3">{counts.assigned} ta yuk sizni kutmoqda</T>
              <T v="small">Yuklarni olgach, yo'lga chiqishni bosing</T>
            </View>
          </Card>
        ) : null}
        {counts.assigned > 0 ? (
          <Button title={`Yo'lga chiqish · ${counts.assigned} ta yuk`} mcIcon="truck-delivery-outline" size="lg" onPress={startTrip} loading={starting} />
        ) : null}

        {items && items.length > 0 ? (
          <View style={st.segment}>
            {([['all', 'Hammasi'], ['on_the_way', "Yo'lda"], ['assigned', 'Olish kerak']] as [Filter, string][]).map(([k, label]) => (
              <Tap key={k} onPress={() => setFilter(k)} style={[st.segItem, filter === k && st.segOn]} haptic={false}>
                <T v="bodyStrong" style={{ fontSize: 13.5 }} color={filter === k ? colors.brand : colors.text2}>
                  {label} <T v="small" color={filter === k ? colors.brand : colors.text3}>{counts[k]}</T>
                </T>
              </Tap>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={items === null ? [] : visible}
        keyExtractor={(d) => String(d.id)}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingBottom: 30 }}
        ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.brand]} tintColor={colors.brand} />}
        ListEmptyComponent={
          items === null ? (
            <View style={{ padding: space.lg, gap: space.md }}><DeliverySkeleton /><DeliverySkeleton /><DeliverySkeleton /></View>
          ) : items.length === 0 ? (
            <EmptyState icon="cube-outline" title="Hozircha yuk yo'q" text="Dispetcher sizga yuk biriktirganda shu yerda paydo bo'ladi. Yangilash uchun pastga torting." />
          ) : (
            <EmptyState icon="funnel-outline" title="Bu bo'limda yuk yo'q" />
          )
        }
        renderItem={({ item }) => <DeliveryCard d={item} />}
        ListHeaderComponentStyle={{ marginBottom: space.md }}
      />
    </View>
  );
}

function Stat({ icon, n, label, color }: { icon: 'cube-outline' | 'navigate-outline' | 'checkmark-circle' | 'close-circle'; n: number; label: string; color: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 3 }}>
      <Icon name={icon} size={18} color={color} />
      <T v="h3" style={{ fontSize: 17 }}>{n}</T>
      <T v="small" style={{ fontSize: 11.5 }} numberOfLines={1}>{label}</T>
    </View>
  );
}

function DeliveryCard({ d }: { d: Delivery }) {
  const s = statusStyle[d.status] ?? statusStyle.assigned;
  const open = () => router.push({ pathname: '/delivery/[id]', params: { id: String(d.id) } });
  return (
    <View style={{ paddingHorizontal: space.lg }}>
      <Card pad={false} onPress={open} style={{ overflow: 'hidden' }}>
        <View style={[st.stripe, { backgroundColor: s.fg }]} />
        <View style={{ padding: space.lg, paddingLeft: space.lg + 4, gap: 8 }}>
          <View style={st.cardTop}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="receipt-outline" size={17} color={colors.text3} />
              <T v="h3" style={{ fontSize: 17 }}>№ {d.invoice_number}</T>
            </View>
            <StatusPill status={d.status} small />
          </View>

          <T v="h2" numberOfLines={1} style={{ fontSize: 17 }}>{d.pharmacy_name}</T>
          <View style={st.addrRow}>
            <Icon name="location-outline" size={16} color={colors.brand} />
            <T v="body" numberOfLines={2} style={{ flex: 1, fontSize: 14, lineHeight: 20 }}>{d.delivery_address}</T>
          </View>

          <View style={st.metaRow}>
            <Chip icon="map-outline" text={d.region_name} />
            {d.package_count ? <Chip icon="cube-outline" text={`${d.package_count} qadoq`} color={colors.text} /> : null}
            {d.planned_date ? <Chip icon="calendar-outline" text={date(d.planned_date)} /> : null}
            {!d.pharmacy_phone ? <Chip icon="warning-outline" text="Telefon yo'q" color={colors.warning} bg={colors.warningSoft} /> : null}
          </View>

          <View style={st.actions}>
            <IconButton name="call" label="Qo'ng'iroq" onPress={() => callPhone(d.pharmacy_phone)} disabled={!d.pharmacy_phone}
              bg={colors.successSoft} color={colors.success} size={42} />
            <IconButton name="navigate" label="Yo'l" onPress={() => openMap(d.latitude, d.longitude, d.delivery_address)}
              bg={colors.infoSoft} color={colors.info} size={42} />
            <View style={{ flex: 1 }} />
            <Tap onPress={open} style={st.openBtn}>
              <T v="bodyStrong" color={colors.brand} style={{ fontSize: 14 }}>Batafsil</T>
              <Icon name="chevron-forward" size={16} color={colors.brand} />
            </Tap>
          </View>
        </View>
      </Card>
    </View>
  );
}

const st = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center' },
  progress: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceAlt, marginTop: 12, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: colors.success },
  statsRow: { flexDirection: 'row', marginTop: 14, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  startCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.violetSoft, borderColor: '#E2D5FB' },
  startIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  segment: { flexDirection: 'row', backgroundColor: '#E6ECEF', borderRadius: radius.md, padding: 4, gap: 4 },
  segItem: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: radius.sm },
  segOn: { backgroundColor: colors.surface, ...shadow(1) },
  stripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addrRow: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  openBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 8, paddingHorizontal: 4 },
});


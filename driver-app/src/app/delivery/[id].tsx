import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, type Delivery } from '../../lib/api';
import { callPhone, date, openMap, phone } from '../../lib/format';
import { GradientHeader } from '../../components/GradientHeader';
import { Button, Card, Divider, Icon, IconBadge, Notice, Skeleton, StatusPill, T, Tap, type IconName } from '../../components/kit';
import { colors, radius, shadow, space } from '../../theme';

export default function DeliveryDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [d, setD] = useState<Delivery | null>(null);
  const [error, setError] = useState('');

  useFocusEffect(useCallback(() => {
    api.get<Delivery>(`/driver/deliveries/${id}`)
      .then((r) => { setD(r.data); setError(''); })
      .catch((e) => setError((e as Error).message));
  }, [id]));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <GradientHeader back title={d ? `№ ${d.invoice_number}` : 'Yetkazish'} subtitle={d?.company_name} extend={44}
        right={d ? <View style={st.pillOnDark}><StatusPill status={d.status} small /></View> : null} />

      <ScrollView style={{ marginTop: -44 }} contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: 150, gap: space.md }}>
        {error ? <Notice kind="error" text={error} /> : null}
        {!d && !error ? (
          <Card style={{ gap: 12 }}><Skeleton w="60%" h={22} /><Skeleton h={14} /><Skeleton w="80%" h={14} /><Skeleton h={48} r={12} /></Card>
        ) : null}

        {d ? (
          <>
            {/* Receiver */}
            <Card style={shadow(2)}>
              <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
                <IconBadge name="storefront-outline" size={52} />
                <View style={{ flex: 1 }}>
                  <T v="caption">Qabul qiluvchi</T>
                  <T v="h2" numberOfLines={2}>{d.pharmacy_name}</T>
                </View>
              </View>
              <View style={st.addrBox}>
                <Icon name="location" size={20} color={colors.brand} />
                <View style={{ flex: 1 }}>
                  <T v="bodyStrong" style={{ lineHeight: 21 }}>{d.delivery_address}</T>
                  <T v="small" style={{ marginTop: 2 }}>{d.region_name}</T>
                </View>
              </View>
              <View style={st.quick}>
                <Quick icon="call" label="Qo'ng'iroq" color={colors.success} bg={colors.successSoft} disabled={!d.pharmacy_phone} onPress={() => callPhone(d.pharmacy_phone)} />
                <Quick icon="navigate" label="Yo'l ko'rsatish" color={colors.info} bg={colors.infoSoft} onPress={() => openMap(d.latitude, d.longitude, d.delivery_address)} />
                <Quick icon="scan" label="Skanerlash" color={colors.brand} bg={colors.brandSoft} onPress={() => router.push('/scan')} />
              </View>
            </Card>

            {/* Details */}
            <Card pad={false}>
              <Info icon="call-outline" label="Telefon" value={phone(d.pharmacy_phone) || "Kiritilmagan"} warn={!d.pharmacy_phone} />
              <Divider style={{ marginLeft: 60 }} />
              <Info icon="person-outline" label="Mas'ul shaxs" value={d.pharmacy_contact || '—'} />
              <Divider style={{ marginLeft: 60 }} />
              <Info icon="cube-outline" label="Qadoqlar" value={d.package_count ? `${d.package_count} ta` : 'Ko\'rsatilmagan'} strong />
              <Divider style={{ marginLeft: 60 }} />
              <Info icon="business-outline" label="Jo'natuvchi" value={d.company_name} />
              <Divider style={{ marginLeft: 60 }} />
              <Info icon="document-text-outline" label="Hisob-faktura sanasi" value={date(d.invoice_date)} />
              {d.planned_date ? (<><Divider style={{ marginLeft: 60 }} /><Info icon="calendar-outline" label="Reja" value={date(d.planned_date)} /></>) : null}
            </Card>

            {d.notes ? (
              <Card style={{ backgroundColor: colors.warningSoft, borderColor: '#F6DDB5' }}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Icon name="chatbubble-ellipses-outline" size={20} color={colors.warning} />
                  <View style={{ flex: 1 }}><T v="caption" color={colors.warning}>Izoh</T><T v="body" color={colors.text}>{d.notes}</T></View>
                </View>
              </Card>
            ) : null}

            {d.status === 'assigned' ? (
              <Notice kind="info" icon="information-circle-outline" text="Bu yuk hali «Olish kerak» holatida. Omborda olgach, bosh sahifada «Yo'lga chiqish» ni bosing." />
            ) : null}
          </>
        ) : null}
      </ScrollView>

      {d ? (
        <View style={[st.bottom, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Button title="Muammo" icon="alert-circle-outline" variant="dangerOutline" style={{ flex: 1 }}
            onPress={() => router.push({ pathname: '/fail/[id]', params: { id: String(d.id) } })} />
          <Button title="Yetkazish" icon="scan-outline" variant="success" style={{ flex: 1.6 }} onPress={() => router.push('/scan')} />
        </View>
      ) : null}
    </View>
  );
}

function Quick({ icon, label, color, bg, onPress, disabled }: { icon: IconName; label: string; color: string; bg: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Tap onPress={onPress} disabled={disabled} style={[st.quickItem, { backgroundColor: bg }]} accessibilityLabel={label}>
      <Icon name={icon} size={22} color={color} />
      <T v="small" color={color} style={{ fontSize: 12 }} numberOfLines={1}>{label}</T>
    </Tap>
  );
}

function Info({ icon, label, value, warn, strong }: { icon: IconName; label: string; value: string; warn?: boolean; strong?: boolean }) {
  return (
    <View style={st.info}>
      <IconBadge name={icon} size={34} color={warn ? colors.warning : colors.text2} bg={warn ? colors.warningSoft : colors.surfaceAlt} />
      <View style={{ flex: 1 }}>
        <T v="small">{label}</T>
        <T v={strong ? 'h3' : 'bodyStrong'} color={warn ? colors.warning : colors.text}>{value}</T>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  pillOnDark: { backgroundColor: '#fff', borderRadius: 99 },
  addrBox: { flexDirection: 'row', gap: 10, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: 12, marginTop: space.lg },
  quick: { flexDirection: 'row', gap: 10, marginTop: space.md },
  quickItem: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 12, borderRadius: radius.md },
  info: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: space.lg, paddingVertical: 11 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 10, paddingHorizontal: space.lg, paddingTop: 12, backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, ...shadow(3) },
});

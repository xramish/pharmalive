import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api, API_URL, APP_VERSION, type HistoryItem, type Summary } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { initials, phone } from '../../lib/format';
import { GradientHeader } from '../../components/GradientHeader';
import { Button, Card, Divider, Icon, IconBadge, T, type IconName } from '../../components/kit';
import { colors, space } from '../../theme';

export default function Profile() {
  const { user, logout } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [month, setMonth] = useState<{ ok: number; fail: number } | null>(null);

  useFocusEffect(useCallback(() => {
    api.get('/driver/deliveries').then((r) => setSummary((r.meta?.summary as Summary) ?? null)).catch(() => undefined);
    api.get<HistoryItem[]>('/driver/deliveries?scope=history').then((r) => {
      const ok = r.data.filter((i) => i.result === 'delivered').length;
      setMonth({ ok, fail: r.data.length - ok });
    }).catch(() => undefined);
  }, []));

  const rate = month && month.ok + month.fail > 0 ? Math.round((month.ok / (month.ok + month.fail)) * 100) : null;

  function confirmLogout() {
    Alert.alert('Chiqish', 'Hisobingizdan chiqasizmi?', [
      { text: 'Bekor qilish', style: 'cancel' },
      { text: 'Chiqish', style: 'destructive', onPress: () => void logout() },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <GradientHeader back title="Profil" extend={50} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: 40, gap: space.lg }} style={{ marginTop: -50 }}>
        <Card style={{ alignItems: 'center', paddingVertical: space.xl }}>
          <View style={st.avatar}><T v="display" color="#fff">{initials(user?.full_name)}</T></View>
          <T v="h1" style={{ marginTop: space.md }}>{user?.full_name}</T>
          <T v="body">{phone(user?.login) || user?.login}</T>
          <View style={st.rolePill}><Icon name="car-outline" size={14} color={colors.brand} /><T v="small" color={colors.brand}>Haydovchi</T></View>
        </Card>

        <View style={{ flexDirection: 'row', gap: space.md }}>
          <Stat icon="today-outline" value={String(summary?.delivered_today ?? '—')} label="Bugun yetkazildi" />
          <Stat icon="calendar-outline" value={month ? String(month.ok) : '—'} label="30 kunda" />
          <Stat icon="trophy-outline" value={rate === null ? '—' : `${rate}%`} label="Muvaffaqiyat" />
        </View>

        <Card pad={false}>
          <Row icon="phone-portrait-outline" label="Ilova versiyasi" value={`v${APP_VERSION}`} />
          <Divider style={{ marginLeft: 64 }} />
          <Row icon="server-outline" label="Server" value={API_URL.replace(/^https?:\/\//, '').replace(/\/api\/v1$/, '')} />
          <Divider style={{ marginLeft: 64 }} />
          <Row icon="shield-checkmark-outline" label="Xavfsizlik" value="Shifrlangan sessiya" />
        </Card>

        <Button title="Hisobdan chiqish" icon="log-out-outline" variant="dangerOutline" onPress={confirmLogout} />
      </ScrollView>
    </View>
  );
}

function Stat({ icon, value, label }: { icon: IconName; value: string; label: string }) {
  return (
    <Card style={{ flex: 1, alignItems: 'center', gap: 4, paddingVertical: space.lg, paddingHorizontal: 6 }}>
      <Icon name={icon} size={22} color={colors.brand} />
      <T v="h2">{value}</T>
      <T v="small" style={{ textAlign: 'center', fontSize: 11.5 }}>{label}</T>
    </Card>
  );
}

function Row({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <View style={st.row}>
      <IconBadge name={icon} size={36} />
      <T v="bodyStrong" style={{ flex: 1 }}>{label}</T>
      <T v="small" numberOfLines={1} style={{ maxWidth: '45%' }}>{value}</T>
    </View>
  );
}

const st = StyleSheet.create({
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: colors.brandSoft },
  rolePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.brandSoft, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 99, marginTop: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: space.lg, paddingVertical: 14 },
});

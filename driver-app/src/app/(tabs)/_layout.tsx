import { StyleSheet, Text, View } from 'react-native';
import { Tabs, type BottomTabBarProps } from 'expo-router/tabs';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon, Tap, type IconName } from '../../components/kit';
import { colors, font, shadow } from '../../theme';

const TABS: Record<string, { label: string; icon: IconName; iconActive: IconName }> = {
  index: { label: 'Yetkazishlar', icon: 'cube-outline', iconActive: 'cube' },
  history: { label: 'Tarix', icon: 'time-outline', iconActive: 'time' },
};

/** Bottom bar: Deliveries · [ big QR scan button ] · History */
function TabBar({ state, navigation, insets }: BottomTabBarProps) {
  const routes = state.routes.filter((r) => TABS[r.name]);
  const item = (r: (typeof routes)[number]) => {
    const focused = state.routes[state.index]?.key === r.key;
    const t = TABS[r.name];
    return (
      <Tap key={r.key} style={st.tab} onPress={() => navigation.navigate(r.name)} accessibilityLabel={t.label}>
        <Icon name={focused ? t.iconActive : t.icon} size={24} color={focused ? colors.brand : colors.text3} />
        <Text style={[st.label, { color: focused ? colors.brand : colors.text3 }]}>{t.label}</Text>
      </Tap>
    );
  };
  return (
    <View style={[st.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {routes[0] ? item(routes[0]) : null}
      <View style={st.centerSlot}>
        <Tap onPress={() => router.push('/scan')} accessibilityLabel="QR skanerlash" style={st.scanWrap}>
          <LinearGradient colors={[colors.brand, colors.brandDark]} style={st.scan}>
            <Icon name="scan-outline" size={30} color="#fff" />
          </LinearGradient>
        </Tap>
        <Text style={[st.label, { color: colors.brand, marginTop: 4 }]}>Skanerlash</Text>
      </View>
      {routes[1] ? item(routes[1]) : null}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(p) => <TabBar {...p} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="history" />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}

const st = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'flex-end', backgroundColor: colors.surface, paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, ...shadow(3),
  },
  tab: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 4 },
  label: { fontFamily: font.semibold, fontSize: 11.5 },
  centerSlot: { width: 110, alignItems: 'center' },
  scanWrap: { marginTop: -34, borderRadius: 36, ...shadow(3) },
  scan: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: colors.surface },
});

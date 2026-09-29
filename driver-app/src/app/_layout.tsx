import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../lib/auth';
import { C } from '../components/ui';

function RootStack() {
  const { ready, user } = useAuth();
  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.primary }}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: C.primaryDark },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: C.bg },
      }}
    >
      {/* Only drivers who are logged in can see delivery screens */}
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="index" options={{ title: 'Yetkazishlar' }} />
        <Stack.Screen name="delivery/[id]" options={{ title: 'Yetkazish' }} />
        <Stack.Screen name="scan" options={{ title: 'QR skanerlash', headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="confirm" options={{ title: 'Yetkazishni tasdiqlash' }} />
        <Stack.Screen name="fail/[id]" options={{ title: 'Yetkazilmadi' }} />
        <Stack.Screen name="history" options={{ title: 'Tarix (30 kun)' }} />
        <Stack.Screen name="profile" options={{ title: 'Profil' }} />
      </Stack.Protected>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <RootStack />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

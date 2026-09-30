import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Inter_800ExtraBold } from '@expo-google-fonts/inter/800ExtraBold';
import { AuthProvider, useAuth } from '../lib/auth';
import { ToastProvider } from '../components/Toast';
import { colors } from '../theme';

function Splash() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brandDark }}>
      <ActivityIndicator color={colors.mint} size="large" />
    </View>
  );
}

function RootStack() {
  const { ready, user } = useAuth();
  if (!ready) return <Splash />;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'slide_from_right' }}>
      {/* Only a logged-in driver can reach delivery screens */}
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="delivery/[id]" />
        <Stack.Screen name="scan" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
        <Stack.Screen name="confirm" />
        <Stack.Screen name="fail/[id]" />
        <Stack.Screen name="success" options={{ animation: 'fade', gestureEnabled: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="login" options={{ animation: 'fade' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold });
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {fontsLoaded ? (
        <ToastProvider>
          <AuthProvider>
            <RootStack />
          </AuthProvider>
        </ToastProvider>
      ) : <Splash />}
    </SafeAreaProvider>
  );
}

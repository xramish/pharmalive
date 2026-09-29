import { Alert, ScrollView, Text } from 'react-native';
import { useAuth } from '../lib/auth';
import { API_URL, APP_VERSION } from '../lib/api';
import { Button, C, Card, Row } from '../components/ui';

export default function Profile() {
  const { user, logout } = useAuth();
  return (
    <ScrollView contentContainerStyle={{ padding: 14, gap: 12 }}>
      <Card>
        <Text style={{ fontSize: 20, fontWeight: '800', color: C.text, marginBottom: 6 }}>{user?.full_name}</Text>
        <Row label="Login" value={user?.login ?? ''} />
        <Row label="Rol" value="Haydovchi" />
        <Row label="Ilova" value={`v${APP_VERSION}`} />
        <Row label="Server" value={API_URL.replace(/^https?:\/\//, '').replace(/\/api\/v1$/, '')} />
      </Card>
      <Button
        title="Chiqish"
        variant="danger"
        onPress={() =>
          Alert.alert('Chiqish', 'Hisobdan chiqasizmi?', [
            { text: 'Yo\'q', style: 'cancel' },
            { text: 'Ha, chiqish', style: 'destructive', onPress: () => void logout() },
          ])
        }
      />
    </ScrollView>
  );
}

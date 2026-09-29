import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, ApiError, setToken, setUnauthorizedHandler, type User } from './api';

const TOKEN_KEY = 'pl_driver_token';
const USER_KEY = 'pl_driver_user';

type AuthState = {
  ready: boolean;
  user: User | null;
  login: (login: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const clear = useCallback(async () => {
    setToken(null);
    setUser(null);
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  // Session expired / driver deactivated → back to login from anywhere
  useEffect(() => setUnauthorizedHandler(() => void clear()), [clear]);

  // Restore session on app start
  useEffect(() => {
    (async () => {
      try {
        const saved = await SecureStore.getItemAsync(TOKEN_KEY);
        if (saved) {
          setToken(saved);
          try {
            const me = await api.get<User>('/auth/me');
            setUser(me.data);
            await SecureStore.setItemAsync(USER_KEY, JSON.stringify(me.data));
          } catch (e) {
            if (e instanceof ApiError && e.isNetwork) {
              // Offline at start: open the app with the cached profile
              const cached = await SecureStore.getItemAsync(USER_KEY);
              if (cached) setUser(JSON.parse(cached) as User);
            } else {
              await clear(); // token rejected by the server
            }
          }
        }
      } catch {
        await clear();
      } finally {
        setReady(true);
      }
    })();
  }, [clear]);

  const login = useCallback(async (loginValue: string, password: string) => {
    const deviceName = `${Platform.OS} ${Platform.Version} · ${Constants.deviceName ?? 'phone'}`.slice(0, 120);
    const r = await api.post<{ token: string; user: User }>('/auth/login', {
      login: loginValue.trim(),
      password,
      client: Platform.OS === 'ios' ? 'ios' : 'android',
      device_name: deviceName,
    });
    if (r.data.user.role !== 'driver') {
      setToken(r.data.token);
      await api.post('/auth/logout').catch(() => undefined);
      setToken(null);
      throw new ApiError(403, 'not_driver', 'Bu ilova faqat haydovchilar uchun. Veb-paneldan foydalaning');
    }
    setToken(r.data.token);
    await SecureStore.setItemAsync(TOKEN_KEY, r.data.token);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(r.data.user));
    setUser(r.data.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      /* offline logout still clears the device */
    }
    await clear();
  }, [clear]);

  const value = useMemo(() => ({ ready, user, login, logout }), [ready, user, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}

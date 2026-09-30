/**
 * Secure key-value storage: encrypted SecureStore on the phone.
 * (localStorage is used only in the browser design preview — the app never ships to web.)
 */
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const web = Platform.OS === 'web';

export async function getItem(key: string): Promise<string | null> {
  if (web) return globalThis.localStorage?.getItem(key) ?? null;
  return SecureStore.getItemAsync(key);
}
export async function setItem(key: string, value: string): Promise<void> {
  if (web) { globalThis.localStorage?.setItem(key, value); return; }
  await SecureStore.setItemAsync(key, value);
}
export async function deleteItem(key: string): Promise<void> {
  if (web) { globalThis.localStorage?.removeItem(key); return; }
  await SecureStore.deleteItemAsync(key);
}

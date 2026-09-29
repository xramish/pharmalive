/** GPS + camera helpers used when confirming a delivery. */
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

export type Gps = { latitude: number; longitude: number; accuracy: number | null };

/**
 * Current position, or null if permission is denied / GPS is off.
 * Tries a fresh fix (max ~12 s), then falls back to the last known position (≤ 2 min old).
 */
export async function getGps(): Promise<Gps | null> {
  const perm = await Location.requestForegroundPermissionsAsync();
  if (perm.status !== 'granted') return null;

  const toGps = (p: Location.LocationObject): Gps => ({
    latitude: p.coords.latitude,
    longitude: p.coords.longitude,
    accuracy: p.coords.accuracy ?? null,
  });

  try {
    const fresh = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 12000)),
    ]);
    if (fresh) return toGps(fresh);
  } catch {
    /* fall through */
  }
  try {
    const last = await Location.getLastKnownPositionAsync({ maxAge: 120000 });
    return last ? toGps(last) : null;
  } catch {
    return null;
  }
}

/**
 * Take a proof-of-delivery photo with the camera.
 * Resized to max 1280 px and JPEG-compressed (~150–300 KB) to save mobile data.
 * Returns a local file URI, or null if the driver cancelled.
 */
export async function takePhoto(): Promise<string | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (perm.status !== 'granted') throw new Error('Kameraga ruxsat berilmagan. Sozlamalardan ruxsat bering');

  const res = await ImagePicker.launchCameraAsync({ mediaTypes: 'images', quality: 0.8, allowsEditing: false, exif: false });
  if (res.canceled || !res.assets?.length) return null;
  const asset = res.assets[0];

  try {
    const ctx = ImageManipulator.manipulate(asset.uri);
    if ((asset.width ?? 0) > 1280 || (asset.height ?? 0) > 1280) {
      if ((asset.width ?? 0) >= (asset.height ?? 0)) ctx.resize({ width: 1280 });
      else ctx.resize({ height: 1280 });
    }
    const img = await ctx.renderAsync();
    const saved = await img.saveAsync({ compress: 0.6, format: SaveFormat.JPEG });
    return saved.uri;
  } catch {
    return asset.uri; // resizing failed — upload the original
  }
}

/** multipart file part for React Native fetch */
export function filePart(uri: string) {
  return { uri, name: 'photo.jpg', type: 'image/jpeg' } as unknown as Blob;
}

import { Linking } from 'react-native';

export function phone(v: string | null | undefined): string {
  if (!v) return '';
  const s = String(v);
  return s.length === 12 ? `+${s.slice(0, 3)} ${s.slice(3, 5)} ${s.slice(5, 8)} ${s.slice(8, 10)} ${s.slice(10)}` : s;
}

export function date(v: string | null | undefined): string {
  if (!v) return '—';
  const [y, m, d] = v.slice(0, 10).split('-');
  return `${d}.${m}.${y}`;
}

export function time(v: string | null | undefined): string {
  return v ? v.slice(11, 16) : '';
}

export function callPhone(v: string | null) {
  if (v) void Linking.openURL(`tel:+${v.replace(/\D/g, '')}`);
}

/** Opens Yandex Maps (app if installed, otherwise browser) with a route to the pharmacy. */
export function openMap(lat: number | null, lng: number | null, address: string) {
  const url = lat !== null && lng !== null
    ? `https://yandex.uz/maps/?rtext=~${lat},${lng}&rtt=auto`
    : `https://yandex.uz/maps/?text=${encodeURIComponent(address)}`;
  void Linking.openURL(url);
}

/** Server expects "YYYY-MM-DD HH:MM:SS" (phone local time). */
export function deviceTime(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** "1.2.10" vs "1.3.0" → -1 / 0 / 1 */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

const WEEKDAYS = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];

/** "Chorshanba, 30-sentabr" */
export function todayLong(d = new Date()): string {
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()}-${MONTHS[d.getMonth()]}`;
}

export function greeting(d = new Date()): string {
  const h = d.getHours();
  return h < 5 ? 'Xayrli tun' : h < 11 ? 'Xayrli tong' : h < 17 ? 'Xayrli kun' : 'Xayrli kech';
}

/** "Bugun" / "Kecha" / "28-sentabr, Dushanba" for a "YYYY-MM-DD ..." string */
export function dayLabel(v: string): string {
  const [y, m, d] = v.slice(0, 10).split('-').map(Number);
  const day = new Date(y, m - 1, d);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - day.getTime()) / 86400000);
  if (diff === 0) return 'Bugun';
  if (diff === 1) return 'Kecha';
  return `${d}-${MONTHS[m - 1]}, ${WEEKDAYS[day.getDay()]}`;
}

export function initials(name: string | undefined): string {
  if (!name) return '?';
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase();
}

export function firstName(name: string | undefined): string {
  return name?.trim().split(/\s+/)[0] ?? '';
}

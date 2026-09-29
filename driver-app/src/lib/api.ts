/**
 * Pharmalive API client for the driver app.
 * - Bearer token from secure storage
 * - JSON envelope { ok, data, meta } / { ok:false, error:{ code, message } }
 * - Uzbek user-facing error messages come from the server
 */
import Constants from 'expo-constants';

export const API_URL: string =
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ?? 'https://api.pharmalive.uz/api/v1';

export const APP_VERSION: string = Constants.expoConfig?.version ?? '1.0.0';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details: Record<string, string> = {},
  ) {
    super(message);
  }
  get isNetwork() {
    return this.code === 'network' || this.code === 'timeout';
  }
}

let token: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setToken(t: string | null) {
  token = t;
}
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

type Json = Record<string, unknown>;
export type Envelope<T> = { ok: true; data: T; meta?: Json };

async function request<T>(method: string, path: string, body?: Json | FormData, timeoutMs = 20000): Promise<Envelope<T>> {
  const headers: Record<string, string> = { Accept: 'application/json', 'X-Client-Version': APP_VERSION };
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload: string | FormData | undefined;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(API_URL + path, { method, headers, body: payload, signal: ctrl.signal });
  } catch (e) {
    const aborted = (e as Error)?.name === 'AbortError';
    throw new ApiError(0, aborted ? 'timeout' : 'network',
      aborted ? 'Server javob bermadi. Internetni tekshirib, qayta urinib ko\'ring' : 'Internet aloqasi yo\'q');
  } finally {
    clearTimeout(timer);
  }

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON */
  }
  if (!json) throw new ApiError(res.status, 'bad_response', `Serverdan noto'g'ri javob (${res.status})`);
  if (!json.ok) {
    const err = json.error ?? {};
    if (res.status === 401 && path !== '/auth/login') onUnauthorized?.();
    throw new ApiError(res.status, err.code ?? 'error', err.message ?? 'Xatolik', err.details ?? {});
  }
  return json as Envelope<T>;
}

export const api = {
  get: <T>(p: string) => request<T>('GET', p),
  post: <T>(p: string, b?: Json) => request<T>('POST', p, b ?? {}),
  upload: <T>(p: string, form: FormData) => request<T>('POST', p, form, 60000),
};

// ---------------------------------------------------------------- types

export type User = { id: number; full_name: string; login: string; role: string; permissions: string[] };

export type Delivery = {
  id: number;
  invoice_number: string;
  invoice_date: string;
  status: 'assigned' | 'on_the_way' | 'delivered' | 'failed' | string;
  status_label: string;
  package_count: number | null;
  delivery_address: string;
  planned_date: string | null;
  notes: string | null;
  pharmacy_name: string;
  pharmacy_phone: string | null;
  pharmacy_contact: string | null;
  latitude: number | null;
  longitude: number | null;
  region_name: string;
  company_name: string;
};

export type HistoryItem = {
  attempt_id: number;
  result: 'delivered' | 'failed';
  created_at: string;
  failure_reason: string | null;
  comment: string | null;
  id: number;
  invoice_number: string;
  pharmacy_name: string;
  region_name: string;
};

export type Summary = { assigned: number; on_the_way: number; delivered_today: number; failed_today: number };
export type FailureReason = { id: number; code: string; name: string; requires_comment: number | boolean };
export type AppConfig = { android_min_version: string; ios_min_version: string; require_delivery_photo: boolean; require_delivery_gps: boolean };
export type ScanResult = { scan_id: number; delivery: Delivery };
export type AttemptResult = { attempt_id: number; invoice_id: number; result: string; invoice_number: string; replayed?: boolean };

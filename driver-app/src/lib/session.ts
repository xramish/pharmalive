/**
 * Small in-memory hand-off between screens (scan → confirm) and cached
 * reference data. Nothing sensitive is persisted here.
 */
import { api, type AppConfig, type FailureReason, type ScanResult } from './api';

let lastScan: ScanResult | null = null;
export const setLastScan = (s: ScanResult | null) => { lastScan = s; };
export const getLastScan = () =>
  lastScan ?? ((globalThis as { __PL_PREVIEW_SCAN__?: ScanResult }).__PL_PREVIEW_SCAN__ ?? null); // browser design preview only

let reasons: FailureReason[] | null = null;
export async function failureReasons(): Promise<FailureReason[]> {
  if (!reasons) reasons = (await api.get<{ failure_reasons: FailureReason[] }>('/reference')).data.failure_reasons;
  return reasons;
}

let config: AppConfig | null = null;
export async function appConfig(): Promise<AppConfig> {
  if (!config) config = (await api.get<AppConfig>('/app/config')).data;
  return config;
}

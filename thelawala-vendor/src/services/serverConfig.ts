import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const extra =
  (Constants.expoConfig?.extra ??
    Constants.manifest?.extra) as Record<string, unknown> | undefined;

const DEFAULT_BASE_URL =
  typeof extra?.apiBaseUrl === 'string' ? extra.apiBaseUrl : 'http://10.0.2.2:5000';
const STORAGE_KEY = 'thelawala_vendor_api_base_url';

let runtimeBaseUrl = DEFAULT_BASE_URL;

function normalizeServerUrl(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;

  try {
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return withProtocol.replace(/\/+$/, '');
  } catch {
    return null;
  }
}

export function getServerBaseUrl() {
  return runtimeBaseUrl;
}

export async function loadServerBaseUrl() {
  const saved = await AsyncStorage.getItem(STORAGE_KEY);
  if (!saved) {
    runtimeBaseUrl = DEFAULT_BASE_URL;
    return null;
  }

  const normalized = normalizeServerUrl(saved);
  if (!normalized) {
    await AsyncStorage.removeItem(STORAGE_KEY);
    runtimeBaseUrl = DEFAULT_BASE_URL;
    return null;
  }

  runtimeBaseUrl = normalized;
  return normalized;
}

export async function setServerBaseUrl(value: string) {
  const normalized = normalizeServerUrl(value);
  if (!normalized) {
    throw new Error('Please enter a valid server URL or IP:PORT');
  }

  await AsyncStorage.setItem(STORAGE_KEY, normalized);
  runtimeBaseUrl = normalized;
  return normalized;
}

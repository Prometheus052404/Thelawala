import Constants from 'expo-constants';
import { io, Socket } from 'socket.io-client';

const extra = (Constants.expoConfig?.extra ?? Constants.manifest?.extra) as Record<string, unknown> | undefined;
const BASE_URL = typeof extra?.apiBaseUrl === 'string' ? extra.apiBaseUrl : 'http://10.0.2.2:5000';

// ──────── REST helpers ────────

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const data = await res.json();
  if (!res.ok) throw { status: res.status, ...data };
  return data;
}

export function clientLogin(phoneNumber: string, password: string) {
  return request('/api/auth/client/login', {
    method: 'POST',
    body: JSON.stringify({ phoneNumber, password }),
  });
}

export function clientRegister(phoneNumber: string, password: string) {
  return request('/api/auth/client/register', {
    method: 'POST',
    body: JSON.stringify({ phoneNumber, password }),
  });
}

export function searchVendorById(thelaId: string) {
  return request(`/api/search/vendor/${encodeURIComponent(thelaId)}`);
}

export function searchVendorsByItem(itemName: string) {
  return request(`/api/search/item/${encodeURIComponent(itemName)}`);
}

// ──────── Socket ────────

let socket: Socket | null = null;

export function connectSocket(token: string): Socket {
  if (socket?.connected) return socket;
  // Clean up any stale socket before creating a new one
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
  }
  socket = io(BASE_URL, { auth: { token }, reconnection: true, reconnectionAttempts: Infinity, reconnectionDelay: 2000 });
  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

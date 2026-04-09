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

export function vendorLogin(thelaId: string, password: string) {
  return request('/api/auth/vendor/login', {
    method: 'POST',
    body: JSON.stringify({ thelaId, password }),
  });
}

export function vendorRegister(thelaId: string, password: string) {
  return request('/api/auth/vendor/register', {
    method: 'POST',
    body: JSON.stringify({ thelaId, password }),
  });
}

export function updateInventory(token: string, inventory: any[]) {
  return request('/api/vendor/inventory', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ inventory }),
  });
}

export function fetchInventory(token: string) {
  return request('/api/vendor/inventory', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ──────── Socket connection ────────

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

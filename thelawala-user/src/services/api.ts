import { io, Socket } from 'socket.io-client';
import { getServerBaseUrl } from './serverConfig';

// ──────── REST helpers ────────

async function request(path: string, options: RequestInit = {}) {
  const baseUrl = getServerBaseUrl();
  const res = await fetch(`${baseUrl}${path}`, {
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
  const baseUrl = getServerBaseUrl();
  if (socket?.connected) return socket;
  // Clean up any stale socket before creating a new one
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
  }
  socket = io(baseUrl, { auth: { token }, reconnection: true, reconnectionAttempts: Infinity, reconnectionDelay: 2000 });
  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

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

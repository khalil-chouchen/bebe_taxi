import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { SOCKET_URL } from '../config/env';
import { TOKEN_STORAGE_KEY } from '../constants';

let socket: Socket | null = null;

export async function connectSocket(): Promise<Socket> {
  if (socket?.connected) return socket;

  const token = await SecureStore.getItemAsync(TOKEN_STORAGE_KEY);

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket?.id);
  });

  socket.on('connect_error', (err) => {
    console.warn('[Socket] Connection error:', err.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function emitEvent(event: string, data?: unknown): void {
  if (socket?.connected) {
    socket.emit(event, data);
  } else {
    console.warn('[Socket] Cannot emit — not connected');
  }
}

// ================================================
// ÁGAPE v10 — Socket Service
// Singleton con reconexión automática
// ================================================
import { io } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import config from '../config';

let socket = null;

export async function conectarSocket() {
  if (socket?.connected) return socket;

  const token = await SecureStore.getItemAsync('agape_token');
  if (!token) return null;

  socket = io(config.SOCKET_URL || config.API_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 10000,
    timeout: 20000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Conectado:', socket.id);
  });

  socket.on('connect_error', (err) => {
    console.warn('[Socket] Error de conexión:', err.message);
  });

  socket.on('disconnect', (reason) => {
    console.warn('[Socket] Desconectado:', reason);
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function desconectarSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

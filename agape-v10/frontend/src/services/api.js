// ================================================
// ÁGAPE v10.1 — API Service (Bloqueantes corregidos)
// ================================================

import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import config from '../config';

const BASE_URL = config.API_URL;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request Interceptor: JWT ──────────────────────────────
api.interceptors.request.use(async (cfg) => {
  try {
    const token = await SecureStore.getItemAsync('agape_token');
    if (token) cfg.headers.Authorization = `Bearer ${token}`;
  } catch {}
  return cfg;
});

// ── Response Interceptor ──────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('agape_token');
    }
    return Promise.reject(error);
  }
);

// ── AUTH ─────────────────────────────────────────────────
export const authAPI = {
  register: (datos) => api.post('/api/auth/register', {
    ...datos, accepted_terms: 'true', accepted_privacy: 'true',
  }),
  login:          (email, password)    => api.post('/api/auth/login', { email, password }),
  getMe:          ()                   => api.get('/api/auth/me'),
  logout:         ()                   => api.post('/api/auth/logout'),
  forgotPassword: (email)              => api.post('/api/auth/forgot-password', { email }),
  resetPassword:  (token, newPassword) => api.post('/api/auth/reset-password', { token, newPassword }),
  changePassword: (currentPassword, newPassword) =>
    api.put('/api/auth/password', { currentPassword, newPassword }),
  deleteAccount: () => api.delete('/api/profiles/me'),
};

// ── PERFILES ──────────────────────────────────────────────
export const profileAPI = {
  getProfile:    (userId)   => api.get(`/api/profiles/${userId}`),
  updateProfile: (datos)    => api.put('/api/profiles/me', datos),
  updatePhotos:  (fotos)    => api.put('/api/profiles/me/photos', { fotos }),
  uploadPhoto:   (formData) => api.post('/api/profiles/me/photos', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  reportUser: (userId, motivo, descripcion) =>
    api.post('/api/reports', { reported_user_id: userId, motivo, descripcion }),
  blockUser: (userId) =>
    api.post('/api/reports/block', { blocked_user_id: userId }),
};

// ── MATCHES & SWIPE ───────────────────────────────────────
// CORREGIDO: rutas reales del backend
// - Feed:   GET  /api/feed  (interactions.js)
// - Like:   POST /api/like  (interactions.js)
// - Dislike:POST /api/dislike (interactions.js)
// - Matches:GET  /api/matches (matches.js)
// - Likes recibidos: GET /api/matches/likes (matches.js)
export const matchAPI = {
  getFeed:    (limit = 20) => api.get(`/api/feed?limit=${limit}`),

  swipe: (userId, tipo) => {
    if (tipo === 'dislike') {
      return api.post('/api/dislike', { to_user_id: userId });
    }
    // 'like' y 'superlike' van a /api/like
    return api.post('/api/like', {
      to_user_id: userId,
      connection_type: tipo === 'superlike' ? 'superlike' : 'friendship',
    });
  },

  darLike: (toUserId, connectionType = 'friendship') =>
    api.post('/api/like', { to_user_id: toUserId, connection_type: connectionType }),

  getMatches:        () => api.get('/api/matches'),
  getLikesRecibidos: () => api.get('/api/matches/likes'),   // CORREGIDO: era /likes-received
  eliminarMatch: (matchId) => api.delete(`/api/matches/${matchId}`),
};

// ── ACTIVE NOW ────────────────────────────────────────────
// NOTA: estas rutas no existen aún en el backend.
// Se añaden con fallback seguro para no crashear la app.
export const activeAPI = {
  getActivosAhora: (radius = 30) =>
    api.get(`/api/profiles/active?radius=${radius}`).catch(() => ({ data: { perfiles: [] } })),
  getContador: () =>
    api.get('/api/profiles/active/count').catch(() => ({ data: { total_activos: 0 } })),
};

// ── CHAT ──────────────────────────────────────────────────
export const chatAPI = {
  getConversaciones: ()                          => api.get('/api/chat'),
  getMensajes:       (matchId)                   => api.get(`/api/chat/${matchId}/messages`),
  enviarMensaje:     (matchId, content, tipo = 'text') =>
    api.post(`/api/chat/${matchId}/messages`, { content, tipo }),
};

// ── MONETIZACIÓN ──────────────────────────────────────────
export const monetizationAPI = {
  getPlanes:       ()                                         => api.get('/api/subscriptions/plans'),
  getStatus:       ()                                         => api.get('/api/subscriptions/status'),
  procesarCompra:  (plataforma, product_id, receipt_or_token) =>
    api.post('/api/subscriptions/purchase', { plataforma, product_id, receipt_or_token }),
  restaurarCompras:(plataforma, receipts)                     =>
    api.post('/api/subscriptions/restore', { plataforma, receipts }),
};

// ── NOTIFICACIONES ────────────────────────────────────────
export const notificationAPI = {
  registrarToken: (token, plataforma = 'android') =>
    api.post('/api/notifications/token', { token, plataforma }),
  eliminarToken: () => api.delete('/api/notifications/token'),
};

// ── INTERESES / PAYWALL ───────────────────────────────────
export const interestAPI = {
  getHidden:        ()          => api.get('/api/interests/hidden'),
  getProfileViews:  ()          => api.get('/api/interests/profile-views'),
  logProfileView:   (targetId)  => api.post(`/api/interests/view/${targetId}`),
  evaluatePaywall:  (contexto)  => api.post('/api/interests/paywall', contexto),
  getChatQuestions: ()          => api.get('/api/interests/chat-questions'),
};

// ── MODO INVISIBLE ────────────────────────────────────────
// CORREGIDO: invisibleAPI faltaba — causaba crash en SettingsScreen
export const invisibleAPI = {
  getEstado:   () => api.get('/api/profiles/me/invisible'),
  activar:     () => api.post('/api/profiles/me/invisible', { activo: true }),
  desactivar:  () => api.post('/api/profiles/me/invisible', { activo: false }),
};

// ── ESPIRITUAL ────────────────────────────────────────────
export const spiritualAPI = {
  getDevocional:   () => api.get('/api/spiritual/devotional/today'),
  getVersiculoDia: () => api.get('/api/spiritual/verse/today'),
  getRetos:        () => api.get('/api/spiritual/challenges'),
  completarReto:   (id) => api.post(`/api/spiritual/challenges/${id}/complete`),
  getViaje:        () => api.get('/api/spiritual/journey'),
};

export default api;

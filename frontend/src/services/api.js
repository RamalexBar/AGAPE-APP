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
  // El backend verifica este accessToken directamente contra Google.
  loginConGoogle: (accessToken)        => api.post('/api/auth/google', { accessToken }),
  getMe:          ()                   => api.get('/api/auth/me'),
  logout:         ()                   => api.post('/api/auth/logout'),
  forgotPassword: (email)              => api.post('/api/auth/forgot-password', { email }),
  resetPassword:  (email, codigo, newPassword) => api.post('/api/auth/reset-password', { email, codigo, newPassword }),
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
  reportUser: (userId, razon, descripcion) =>
    api.post('/api/reports', { reported_user_id: userId, razon, descripcion }),
  blockUser: (userId) =>
    api.post(`/api/reports/block/${userId}`),
  unblockUser: (userId) =>
    api.delete(`/api/reports/block/${userId}`),
  getBlockedUsers: () =>
    api.get('/api/reports/blocked'),
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
    // 'like' y 'superlike' van a /api/like.
    // El backend solo acepta connection_type en ['friendship','community','marriage'];
    // no existe un tipo dedicado para "superlike", así que se envía como like normal.
    return api.post('/api/like', {
      to_user_id: userId,
      connection_type: 'friendship',
    });
  },

  darLike: (toUserId, connectionType = 'friendship') =>
    api.post('/api/like', { to_user_id: toUserId, connection_type: connectionType }),

  getMatches:        () => api.get('/api/matches'),
  getLikesRecibidos: () => api.get('/api/matches/likes'),   // CORREGIDO: era /likes-received
  eliminarMatch: (matchId) => api.delete(`/api/matches/${matchId}`),
};

// ── ANUNCIOS (bonus de swipes) ────────────────────────────
export const adAPI = {
  getEstado:  () => api.get('/api/ad-status'),
  verAnuncio: () => api.post('/api/watch-ad'),
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
  restaurarCompras:(plataforma, product_id, receipt_or_token) =>
    api.post('/api/subscriptions/restore', { plataforma, product_id, receipt_or_token }),
};

// ── NOTIFICACIONES ────────────────────────────────────────
export const notificationAPI = {
  registrarToken: (token, plataforma = 'android') =>
    api.post('/api/notifications/token', { token, plataforma }),
  eliminarToken: (token) => api.delete('/api/notifications/token', { data: { token } }),
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
  getDevocional:      () => api.get('/api/spiritual/devocional/hoy'),
  getVersiculoDia:    () => api.get('/api/spiritual/devocional/publico'),
  completarDevocional:(versiculo_id) => api.post('/api/spiritual/devocional/completar', { versiculo_id }),
  getRetos:           () => api.get('/api/spiritual/misiones'),
  completarReto:      (id) => api.post(`/api/spiritual/misiones/${id}/completar`),
  getViaje:           () => api.get('/api/spiritual/perfil'),
};

// ── VERIFICACIÓN DE IDENTIDAD ──────────────────────────────
export const verificationAPI = {
  enviarSelfie: (formData) => api.post('/api/verification/selfie', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

// ── EVENTOS CERCANOS ──────────────────────────────────────
export const eventsAPI = {
  getCercanos: (radio = 30) => api.get(`/api/events/cercanos?radio=${radio}`),
  crearEvento: (datos)      => api.post('/api/events', datos),
  unirse:      (eventId)    => api.post(`/api/events/${eventId}/join`),
};

// -- ENTORNO (personas cercanas por ubicacion) --
export const entornoAPI = {
  actualizarUbicacion: (lat, lon) => api.post('/api/entorno/ubicacion', { lat, lon }),
  getCercanos:         (radio = 30) => api.get(`/api/entorno/cercanos?radio=${radio}`),
  enviarMensajeInicial:(destinatario_id, texto) => api.post('/api/entorno/mensaje', { destinatario_id, texto }),
};

export default api;


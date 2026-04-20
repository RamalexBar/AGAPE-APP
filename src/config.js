// ================================================
// ÁGAPE v10 — Configuración de entorno
// Cambia API_URL antes de hacer build de producción
// ================================================
const DEV_URL    = 'http://localhost:3000';
const PROD_URL   = 'https://agape-backend-7w4h.onrender.com';
const __DEV__ = process.env.NODE_ENV !== 'production';
export default {
  API_URL:    __DEV__ ? DEV_URL    : PROD_URL,
  SOCKET_URL: __DEV__ ? DEV_URL    : PROD_URL,
  APP_VERSION:'10.0.0',
};
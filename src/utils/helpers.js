<<<<<<< HEAD
// ================================================
// ÁGAPE v10 — Helpers & Utilidades
// ================================================
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Calcula la edad a partir de fecha de nacimiento (AAAA-MM-DD)
 */
export function calcularEdad(fechaNacimiento) {
  if (!fechaNacimiento) return null;
  const birth = new Date(fechaNacimiento);
  const hoy   = new Date();
  let edad    = hoy.getFullYear() - birth.getFullYear();
  const m     = hoy.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < birth.getDate())) edad--;
  return edad;
}

/**
 * Formatea tiempo relativo en español
 */
export function tiempoRelativo(fecha) {
  if (!fecha) return '';
  try {
    return formatDistanceToNow(new Date(fecha), { addSuffix: true, locale: es });
  } catch { return ''; }
}

/**
 * Formatea fecha corta
 */
export function formatearFecha(fecha) {
  if (!fecha) return '';
  try {
    return format(new Date(fecha), "d 'de' MMMM", { locale: es });
  } catch { return ''; }
}

/**
 * Formatea hora del mensaje
 */
export function formatearHoraMensaje(fecha) {
  if (!fecha) return '';
  try {
    return format(new Date(fecha), 'HH:mm', { locale: es });
  } catch { return ''; }
}

/**
 * Trunca texto con ellipsis
 */
export function truncar(texto, maxChars = 80) {
  if (!texto) return '';
  return texto.length > maxChars ? `${texto.substring(0, maxChars)}...` : texto;
}

/**
 * Valida email
 */
export function esEmailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Valida fecha AAAA-MM-DD y edad mínima
 */
export function validarFechaNacimiento(fecha) {
  if (!fecha.match(/^\d{4}-\d{2}-\d{2}$/)) return 'Usa el formato AAAA-MM-DD.';
  const edad = calcularEdad(fecha);
  if (edad === null || edad > 120) return 'Fecha inválida.';
  if (edad < 18) return 'Debes tener al menos 18 años.';
  return null;
}

/**
 * Genera color avatar placeholder
 */
export function colorAvatar(nombre) {
  const colores = ['#FF5C8D', '#B44DFF', '#5C6DFF', '#00C9FF', '#4ade80'];
  const i = (nombre?.charCodeAt(0) || 0) % colores.length;
  return colores[i];
}

/**
 * Obtiene iniciales de nombre
 */
export function obtenerIniciales(nombre) {
  if (!nombre) return '?';
  const partes = nombre.trim().split(' ');
  if (partes.length === 1) return partes[0][0].toUpperCase();
  return (partes[0][0] + partes[1][0]).toUpperCase();
}

/**
 * Formatea contador de likes restantes
 */
export function formatearLikes(likes) {
  if (likes === Infinity || likes === 999) return '∞';
  return String(likes);
}

/**
 * Convierte milisegundos a string HH:MM:SS
 */
export function msAContador(ms) {
  if (ms <= 0) return '00:00:00';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
=======
// src/utils/helpers.js
// Utilidades compartidas en todo el backend

/**
 * Wrapper para handlers async — evita try/catch repetitivo.
 * Uso: router.get('/ruta', asyncHandler(async (req, res) => { ... }))
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Respuesta estándar de éxito
 */
const ok = (res, data, status = 200) => res.status(status).json(data);

/**
 * Respuesta estándar de error
 */
const fail = (res, message, status = 400) => res.status(status).json({ error: message });

/**
 * Paginar resultados — extrae limit/offset de query params
 */
const getPagination = (query, defaultLimit = 20, maxLimit = 100) => {
  const limit  = Math.min(parseInt(query.limit)  || defaultLimit, maxLimit);
  const offset = parseInt(query.offset) || 0;
  const page   = parseInt(query.page)   || 1;
  const skip   = query.page ? (page - 1) * limit : offset;
  return { limit, offset: skip, page };
};

/**
 * Sanitizar UUID — devuelve null si no es válido
 */
const safeUUID = (id) => {
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return UUID_REGEX.test(id) ? id : null;
};

module.exports = { asyncHandler, ok, fail, getPagination, safeUUID };
>>>>>>> 50779e87a2148ba0d6e4df2217f2dd411e39a26f

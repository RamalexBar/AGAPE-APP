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

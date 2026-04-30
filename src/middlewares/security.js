const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const xss = require('xss');
const logger = require('../config/logger');

// ── Helmet con cabeceras estrictas ────────────────────────────────
const securityHeaders = helmet({
  contentSecurityPolicy: false, // React Native no usa CSP browser
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'no-referrer' },
});

// ── Límite de payload ─────────────────────────────────────────────
const limitPayloadSize = (req, res, next) => {
  const contentLength = parseInt(req.headers['content-length'] || '0');
  if (contentLength > 10 * 1024 * 1024) {
    const err = new Error('Payload demasiado grande (máximo 10MB).');
    err.status = 413;
    err.code = 'SECURITY_PAYLOAD_TOO_LARGE';
    return next(err);
  }
  next();
};

// ── Sanitizar body/query contra XSS ──────────────────────────────
const sanitize = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'string') {
      obj[key] = xss(obj[key]);
    } else if (typeof obj[key] === 'object') {
      sanitize(obj[key]);
    }
  }
  return obj;
};

const sanitizeMiddleware = (req, res, next) => {
  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  next();
};

// ── Bloqueo básico de SQL injection en strings ─────────────────────
const SQL_PATTERNS = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|EXEC|UNION|CAST|CONVERT|DECLARE)\b)|(-{2})|(\bOR\b\s+\d+\s*=\s*\d+)/gi;

const validateSQLInjection = (req, res, next) => {
  const check = (val) => typeof val === 'string' && SQL_PATTERNS.test(val);
  const fields = [...Object.values(req.body || {}), ...Object.values(req.query || {})];
  if (fields.some(check)) {
    const err = new Error('Solicitud inválida: Se detectaron patrones sospechosos.');
    err.status = 400;
    err.code = 'SECURITY_SQL_INJECTION_DETECTED';
    return next(err);
  }
  next();
};

// ── Rate limiters por contexto ─────────────────────────────────────
const makeLimit = (windowMs, max, message, code) =>
  rateLimit({ 
    windowMs, 
    max, 
    message: { 
      success: false,
      error: { code, message } 
    }, 
    standardHeaders: true, 
    legacyHeaders: false,
    handler: (req, res, next, options) => {
      logger.warn({ ip: req.ip, url: req.originalUrl }, `[RATE LIMIT] ${message}`);
      res.status(429).json(options.message);
    }
  });

const limiters = {
  auth:    makeLimit(15 * 60 * 1000, 10,  'Demasiados intentos de autenticación. Espera 15 minutos.', 'RATE_LIMIT_AUTH'),
  swipe:   makeLimit(60 * 1000,       60, 'Límite de swipes por minuto alcanzado.', 'RATE_LIMIT_SWIPE'),
  chat:    makeLimit(60 * 1000,       30, 'Límite de mensajes por minuto alcanzado.', 'RATE_LIMIT_CHAT'),
  reports: makeLimit(60 * 60 * 1000,   5, 'Límite de reportes por hora alcanzado.', 'RATE_LIMIT_REPORTS'),
  api:     makeLimit(60 * 1000,       120,'Límite de peticiones alcanzado.', 'RATE_LIMIT_API'),
};

module.exports = {
  securityHeaders,
  limitPayloadSize,
  sanitizeMiddleware,
  validateSQLInjection,
  limiters,
};

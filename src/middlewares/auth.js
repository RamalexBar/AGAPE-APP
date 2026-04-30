const jwt = require('jsonwebtoken');
const env = require('../config/env');
const logger = require('../config/logger');

/**
 * Middleware: valida JWT en header Authorization: Bearer <token>
 * Inyecta req.user = { id, email, role }
 */
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (!token) {
    const err = new Error('Token de acceso requerido.');
    err.status = 401;
    err.code = 'AUTH_TOKEN_REQUIRED';
    return next(err);
  }

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
    
    // Validar que no sea un refresh token usado como access token
    if (payload.type === 'refresh') {
      const err = new Error('Token de tipo inválido.');
      err.status = 401;
      err.code = 'AUTH_INVALID_TOKEN_TYPE';
      return next(err);
    }

    req.user = { id: payload.sub, email: payload.email, role: payload.role || 'user' };
    next();
  } catch (err) {
    logger.debug(`[AUTH] Error verificando token: ${err.message}`);
    
    const error = new Error(err.name === 'TokenExpiredError' ? 'Token expirado.' : 'Token inválido.');
    error.status = 401;
    error.code = err.name === 'TokenExpiredError' ? 'AUTH_TOKEN_EXPIRED' : 'AUTH_INVALID_TOKEN';
    next(error);
  }
};

/**
 * Middleware: solo admins
 */
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    const err = new Error('Acceso restringido. Se requieren permisos de administrador.');
    err.status = 403;
    err.code = 'AUTH_FORBIDDEN';
    return next(err);
  }
  next();
};

/**
 * Genera par de tokens (access + refresh) con secretos separados
 */
const generateTokens = (user) => {
  const payload = { sub: user.id, email: user.email, role: user.role || 'user' };

  const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  });

  const refreshToken = jwt.sign(
    { sub: user.id, type: 'refresh' },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN }
  );

  return { accessToken, refreshToken };
};

module.exports = { authenticateToken, requireAdmin, generateTokens };

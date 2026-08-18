const logger = require('../config/logger');
const env = require('../config/env');

/**
 * Middleware global de manejo de errores
 * Estandariza todas las respuestas de error en JSON
 */
const errorHandler = (err, req, res, next) => {
  const statusCode = err.status || err.statusCode || 500;
  const isProduction = env.NODE_ENV === 'production';

  // Loguear el error con contexto
  logger.error({
    err: {
      message: err.message,
      stack: isProduction ? undefined : err.stack,
      ...err,
    },
    req: {
      method: req.method,
      url: req.url,
      params: req.params,
      query: req.query,
      user: req.user ? req.user.id : 'anonymous',
    },
  }, `[ERROR ${statusCode}] ${err.message}`);

  // Respuesta estandarizada
  const response = {
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: isProduction && statusCode === 500 
        ? 'Error interno del servidor. Por favor, intenta más tarde.' 
        : err.message,
    },
  };

  // Añadir detalles de validación si existen (express-validator)
  if (err.errors) {
    response.error.details = err.errors;
  }

  // No filtrar stack trace en desarrollo
  if (!isProduction) {
    response.error.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;

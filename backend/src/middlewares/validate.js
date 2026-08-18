// src/middlewares/validate.js
const { validationResult } = require('express-validator');

/**
 * Ejecuta los resultados de express-validator y responde 422 si hay errores.
 * Usar después de definir las reglas de validación en la ruta.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      error: 'Datos inválidos.',
      campos: errors.array().map(e => ({ campo: e.path, mensaje: e.msg })),
    });
  }
  next();
};

module.exports = { validate };

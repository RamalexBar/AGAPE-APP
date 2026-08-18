// src/middlewares/activity.js
// Actualiza last_active_at en cada request autenticado (fire-and-forget)
const { actualizarActividad } = require('../services/presenceService');

const trackActivity = (req, res, next) => {
  if (req.user?.id) {
    actualizarActividad(req.user.id).catch(() => {});
  }
  next();
};

module.exports = { trackActivity };

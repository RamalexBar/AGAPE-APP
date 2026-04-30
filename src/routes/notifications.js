// src/routes/notifications.js
const router = require('express').Router();
const { body } = require('express-validator');
const { validate } = require('../middlewares/validate');
const { authenticateToken } = require('../middlewares/auth');
const notificationService = require('../services/notificationService');

// POST /api/notifications/token  → registrar FCM token
router.post('/token',
  authenticateToken,
  body('token').notEmpty().withMessage('Token requerido.'),
  body('plataforma').optional().isIn(['android', 'ios']),
  validate,
  async (req, res, next) => {
    try {
      await notificationService.registrarToken(req.user.id, req.body.token, req.body.plataforma || 'android');
      res.json({ success: true, mensaje: 'Token registrado.' });
    } catch (e) { next(e); }
  }
);

// DELETE /api/notifications/token  → eliminar FCM token (logout)
router.delete('/token',
  authenticateToken,
  body('token').notEmpty(),
  validate,
  async (req, res, next) => {
    try {
      await notificationService.eliminarToken(req.user.id, req.body.token);
      res.json({ success: true, mensaje: 'Token eliminado.' });
    } catch (e) { next(e); }
  }
);

module.exports = router;

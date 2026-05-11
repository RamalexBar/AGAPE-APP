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
// POST /api/notifications/send → enviar notificación push
router.post('/send',
  authenticateToken,
  async (req, res, next) => {
    try {
      const { toUserId, title, body, data } = req.body;

      // Obtener token del usuario destino
      const { data: userData } = await require('../models/supabaseClient')
        .from('push_tokens')
        .select('token')
        .eq('user_id', toUserId)
        .single();

      if (!userData?.token) {
        return res.json({ success: false, message: 'Usuario sin token' });
      }

      // Enviar con Expo Push API
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: userData.token,
          title,
          body,
          data: data || {},
          sound: 'default',
        }),
      });

      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  }
);
module.exports = router;

// src/routes/legal.js
const router = require('express').Router();
const { body } = require('express-validator');
const { validate } = require('../middlewares/validate');
const { authenticateToken } = require('../middlewares/auth');
const legalService = require('../services/legalService');

// GET /api/legal/privacy  → Política de privacidad
router.get('/privacy', (req, res, next) => {
  try {
    const contenido = legalService.getLegalDoc('privacy');
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.send(contenido);
  } catch (e) { next(e); }
});

// GET /api/legal/terms  → Términos de servicio
router.get('/terms', (req, res, next) => {
  try {
    const contenido = legalService.getLegalDoc('terms');
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.send(contenido);
  } catch (e) { next(e); }
});

// GET /api/legal/versions  → Versiones actuales (para que el frontend compare)
router.get('/versions', (req, res) => {
  res.json({
    terms_version:   legalService.CURRENT_TERMS_VERSION,
    privacy_version: legalService.CURRENT_PRIVACY_VERSION,
  });
});

// POST /api/legal/accept  → Registrar aceptación de términos
router.post('/accept',
  authenticateToken,
  body('terms_version').notEmpty(),
  body('privacy_version').notEmpty(),
  validate,
  async (req, res, next) => {
    try {
      await legalService.registrarConsentimiento(req.user.id, {
        terms_version:   req.body.terms_version,
        privacy_version: req.body.privacy_version,
        ip:              req.ip,
        user_agent:      req.headers['user-agent'],
      });
      res.json({ success: true, mensaje: 'Términos aceptados. ¡Bienvenido a Ágape! ✝️' });
    } catch (e) { next(e); }
  }
);

// GET /api/legal/status  → ¿Ha aceptado la versión actual?
router.get('/status', authenticateToken, async (req, res, next) => {
  try {
    const status = await legalService.verificarConsentimientoActual(req.user.id);
    res.json(status);
  } catch (e) { next(e); }
});

module.exports = router;

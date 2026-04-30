// src/routes/interests.js — interés oculto + paywall
const router = require('express').Router();
const { authenticateToken } = require('../middlewares/auth');
const { getInteresOculto, registrarVistasPerfil, getVistasPerfil } = require('../services/interestService');
const { evaluarPaywall, registrarVistaPaywall } = require('../services/paywallService');
const { obtenerSuscripcion } = require('../services/monetizationAgapeService');
const { PREGUNTAS_GUIADAS_CHAT } = require('../services/emotionalMessagesService');

// GET /api/interests/hidden — "X personas quieren conocerte"
router.get('/hidden', authenticateToken, async (req, res, next) => {
  try {
    const sub = await obtenerSuscripcion(req.user.id);
    const data = await getInteresOculto(req.user.id, sub.es_premium);
    res.json({ success: true, ...data });
  } catch (e) { next(e); }
});

// GET /api/interests/profile-views — cuántas vistas recibí hoy
router.get('/profile-views', authenticateToken, async (req, res, next) => {
  try {
    const vistas = await getVistasPerfil(req.user.id);
    res.json({ success: true, vistas_hoy: vistas });
  } catch (e) { next(e); }
});

// POST /api/interests/view/:targetId — registrar que vi un perfil
router.post('/view/:targetId', authenticateToken, async (req, res, next) => {
  try {
    await registrarVistasPerfil(req.user.id, req.params.targetId);
    res.json({ success: true });
  } catch (e) { next(e); }
});

// POST /api/interests/paywall — evaluar si mostrar paywall
router.post('/paywall', authenticateToken, async (req, res, next) => {
  try {
    const resultado = await evaluarPaywall(req.user.id, req.body);
    if (resultado.mostrar) {
      await registrarVistaPaywall(req.user.id, resultado.tipo);
    }
    res.json({ success: true, ...resultado });
  } catch (e) { next(e); }
});

// GET /api/interests/chat-questions — preguntas guiadas para el chat
router.get('/chat-questions', authenticateToken, (req, res) => {
  res.json({ success: true, preguntas: PREGUNTAS_GUIADAS_CHAT });
});

module.exports = router;

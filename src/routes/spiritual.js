// ================================================
// ÁGAPE v2 — Rutas: Camino Espiritual
// /api/spiritual/*
// ================================================

const express = require('express');
const router  = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const { obtenerPerfilEspiritual, obtenerRankingCrecimiento, NIVELES, BADGES_ESPIRITUALES } = require('../services/spiritualJourneyService');
const { obtenerDevocionalDelDia, completarDevocional, obtenerHistorialDevocional } = require('../services/devotionalService');
const { obtenerMisionesDelDia, completarMision } = require('../services/dailyChallengesService');
const { obtenerFeedCristiano, procesarSwipeConProposito } = require('../services/christianMatchingService');
const { obtenerSuscripcion, PLANES, comprarConMonedas, TIENDA_MONEDAS } = require('../services/monetizationAgapeService');

// ────────────────────────────────────────────────────────────────
// PERFIL ESPIRITUAL
// ────────────────────────────────────────────────────────────────

// GET /api/spiritual/perfil
// Mi perfil espiritual: nivel, XP, badges, racha
router.get('/perfil', authenticateToken, async (req, res) => {
  try {
    const perfil = await obtenerPerfilEspiritual(req.user.id);
    res.json(perfil);
  } catch (e) {
    res.status(500).json({ error: 'Error al cargar perfil espiritual.' });
  }
});

// GET /api/spiritual/niveles
// Todos los niveles disponibles (para mostrar roadmap)
router.get('/niveles', (req, res) => {
  res.json({ niveles: NIVELES });
});

// GET /api/spiritual/badges
// Todos los badges disponibles con estado del usuario
router.get('/badges', authenticateToken, async (req, res) => {
  try {
    const perfil = await obtenerPerfilEspiritual(req.user.id);
    const idsObtenidos = new Set(perfil.badges.map(b => b.badge_id));
    const todos = Object.values(BADGES_ESPIRITUALES).map(b => ({
      ...b,
      obtenido: idsObtenidos.has(b.id),
    }));
    res.json({ badges: todos, total_obtenidos: idsObtenidos.size });
  } catch (e) {
    res.status(500).json({ error: 'Error al cargar badges.' });
  }
});

// GET /api/spiritual/ranking
// Ranking de crecimiento (no competitivo tóxico — enfocado en inspiración)
router.get('/ranking', authenticateToken, async (req, res) => {
  try {
    const limite = parseInt(req.query.limite) || 20;
    const ranking = await obtenerRankingCrecimiento(limite);
    res.json({
      ranking,
      mensaje: '¡Inspírate en el camino de otros creyentes! 🌟',
      semana: new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }),
    });
  } catch (e) {
    res.status(500).json({ error: 'Error al cargar ranking.' });
  }
});

// ────────────────────────────────────────────────────────────────
// DEVOCIONAL DIARIO
// ────────────────────────────────────────────────────────────────

// GET /api/spiritual/devocional/hoy
// Devocional del día (versículo + reflexión + oración)
router.get('/devocional/hoy', authenticateToken, async (req, res) => {
  try {
    const devocional = await obtenerDevocionalDelDia(req.user.id);
    res.json(devocional);
  } catch (e) {
    res.status(500).json({ error: 'Error al cargar devocional.' });
  }
});

// GET /api/spiritual/devocional/hoy (sin auth — para pantalla de splash)
router.get('/devocional/publico', async (req, res) => {
  try {
    const devocional = await obtenerDevocionalDelDia(null);
    res.json({
      versiculo: devocional.versiculo,
      reflexion: devocional.reflexion,
      fecha: devocional.fecha,
    });
  } catch (e) {
    res.status(500).json({ error: 'Error.' });
  }
});

// POST /api/spiritual/devocional/completar
// Marcar devocional como leído → suma XP y racha
router.post('/devocional/completar', authenticateToken, async (req, res) => {
  try {
    const { versiculo_id } = req.body;
    const resultado = await completarDevocional(req.user.id, versiculo_id);
    res.json(resultado);
  } catch (e) {
    res.status(500).json({ error: 'Error al completar devocional.' });
  }
});

// GET /api/spiritual/devocional/historial
// Historial de devocionales completados
router.get('/devocional/historial', authenticateToken, async (req, res) => {
  try {
    const limite = parseInt(req.query.limite) || 30;
    const historial = await obtenerHistorialDevocional(req.user.id, limite);
    res.json({ historial });
  } catch (e) {
    res.status(500).json({ error: 'Error al cargar historial.' });
  }
});

// ────────────────────────────────────────────────────────────────
// RETOS / MISIONES DIARIAS
// ────────────────────────────────────────────────────────────────

// GET /api/spiritual/misiones
// Misiones del día + progreso
router.get('/misiones', authenticateToken, async (req, res) => {
  try {
    const misiones = await obtenerMisionesDelDia(req.user.id);
    res.json(misiones);
  } catch (e) {
    res.status(500).json({ error: 'Error al cargar misiones.' });
  }
});

// POST /api/spiritual/misiones/:misionId/completar
// Completar una misión y recibir recompensas
router.post('/misiones/:misionId/completar', authenticateToken, async (req, res) => {
  try {
    const resultado = await completarMision(req.user.id, req.params.misionId);
    res.json(resultado);
  } catch (e) {
    res.status(500).json({ error: e.message || 'Error al completar misión.' });
  }
});

// ────────────────────────────────────────────────────────────────
// MATCHING CRISTIANO
// ────────────────────────────────────────────────────────────────

// GET /api/spiritual/feed
// Feed de perfiles compatible espiritualmente
router.get('/feed', authenticateToken, async (req, res) => {
  try {
    const opciones = {
      limite: parseInt(req.query.limite) || 20,
      filtro_nivel_min: req.query.nivel_min ? parseInt(req.query.nivel_min) : null,
      filtro_nivel_max: req.query.nivel_max ? parseInt(req.query.nivel_max) : null,
      filtro_proposito: req.query.proposito || null,
      filtro_denominacion: req.query.denominacion || null,
    };
    const perfiles = await obtenerFeedCristiano(req.user.id, opciones);
    res.json({ perfiles, total: perfiles.length });
  } catch (e) {
    res.status(500).json({ error: 'Error al cargar feed.' });
  }
});

// POST /api/spiritual/swipe
// Swipe con propósito (connect/pass + tipo de conexión)
router.post('/swipe', authenticateToken, async (req, res) => {
  try {
    const { to_user_id, accion, tipo_proposito = 'friendship' } = req.body;
    if (!to_user_id || !accion) return res.status(400).json({ error: 'Faltan campos.' });

    const resultado = await procesarSwipeConProposito(
      req.user.id, to_user_id, accion, tipo_proposito
    );
    res.json(resultado);
  } catch (e) {
    res.status(500).json({ error: e.message || 'Error al procesar swipe.' });
  }
});

// ────────────────────────────────────────────────────────────────
// MONETIZACIÓN
// ────────────────────────────────────────────────────────────────

// GET /api/spiritual/suscripcion
// Estado de suscripción, plan activo, monedas de fe
router.get('/suscripcion', authenticateToken, async (req, res) => {
  try {
    const subs = await obtenerSuscripcion(req.user.id);
    res.json(subs);
  } catch (e) {
    res.status(500).json({ error: 'Error al cargar suscripción.' });
  }
});

// GET /api/spiritual/planes
// Todos los planes disponibles
router.get('/planes', (req, res) => {
  res.json({ planes: Object.values(PLANES) });
});

// GET /api/spiritual/tienda
// Tienda de monedas de fe
router.get('/tienda', authenticateToken, async (req, res) => {
  try {
    const subs = await obtenerSuscripcion(req.user.id);
    res.json({
      monedas_actuales: subs.monedas_fe,
      items: Object.values(TIENDA_MONEDAS),
    });
  } catch (e) {
    res.status(500).json({ error: 'Error.' });
  }
});

// POST /api/spiritual/tienda/comprar
// Comprar item con monedas de fe
router.post('/tienda/comprar', authenticateToken, async (req, res) => {
  try {
    const { item_id } = req.body;
    if (!item_id) return res.status(400).json({ error: 'item_id requerido.' });
    const resultado = await comprarConMonedas(req.user.id, item_id);
    res.json(resultado);
  } catch (e) {
    res.status(400).json({ error: e.message || 'Error al comprar.' });
  }
});

module.exports = router;

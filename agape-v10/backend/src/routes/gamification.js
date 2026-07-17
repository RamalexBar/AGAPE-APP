// ================================================
// ÁGAPE — Rutas: Gamificación (logros y ranking)
// /api/gamification/*
// Reutiliza spiritualJourneyService, pero arma la forma
// exacta de datos que espera GamificationScreen.js
// ================================================
const router = require('express').Router();
const { authenticateToken } = require('../middlewares/auth');
const {
  BADGES_ESPIRITUALES,
  obtenerPerfilEspiritual,
  obtenerRankingCrecimiento,
} = require('../services/spiritualJourneyService');

// GET /api/gamification/mis-logros
router.get('/mis-logros', authenticateToken, async (req, res, next) => {
  try {
    const perfil = await obtenerPerfilEspiritual(req.user.id);
    const idsObtenidos = new Map((perfil.badges || []).map(b => [b.badge_id, b.obtained_at]));

    const logros = Object.values(BADGES_ESPIRITUALES).map(b => ({
      id: b.id,
      emoji: b.emoji,
      titulo: b.titulo,
      descripcion: b.descripcion,
      obtenido: idsObtenidos.has(b.id),
      fecha_obtenido: idsObtenidos.get(b.id) || null,
    }));

    res.json({
      racha_dias: perfil.racha_devocional || 0,
      obtenidos_total: perfil.badges_total || 0,
      reputacion: perfil.total_xp || 0,
      nivel: perfil.nivel,
      logros,
    });
  } catch (e) { next(e); }
});

// GET /api/gamification/ranking?limite=20
router.get('/ranking', authenticateToken, async (req, res, next) => {
  try {
    const limite = parseInt(req.query.limite) || 20;
    const rankingCrudo = await obtenerRankingCrecimiento(limite);

    const ranking = rankingCrudo.map(r => ({
      id: r.user?.id,
      nombre: r.user?.nombre,
      avatar_url: r.user?.avatar_url,
      is_verified: r.user?.is_verified,
      posicion: r.posicion,
      total_xp: r.total_xp,
      nivel: r.nivel,
      racha_devocional: r.racha_devocional,
    }));

    res.json({ ranking });
  } catch (e) { next(e); }
});

module.exports = router;
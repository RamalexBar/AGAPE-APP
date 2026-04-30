// ================================================
// ÁGAPE — Controlador de Interacciones (Tinder Core)
// ================================================
const christianMatchingService = require('../services/christianMatchingService');

/**
 * Dar LIKE a un usuario
 * POST /api/like
 */
exports.like = async (req, res, next) => {
  try {
    const { to_user_id, connection_type = 'friendship' } = req.body;
    
    if (!to_user_id) {
      return res.status(400).json({ error: 'El ID del usuario es requerido.' });
    }

    const resultado = await christianMatchingService.procesarSwipeConProposito(
      req.user.id, 
      to_user_id, 
      'connect', 
      connection_type
    );

    res.json({
      success: true,
      ...resultado
    });
  } catch (e) {
    next(e);
  }
};

/**
 * Rechazar (DISLIKE) a un usuario
 * POST /api/dislike
 */
exports.dislike = async (req, res, next) => {
  try {
    const { to_user_id } = req.body;

    if (!to_user_id) {
      return res.status(400).json({ error: 'El ID del usuario es requerido.' });
    }

    const resultado = await christianMatchingService.procesarSwipeConProposito(
      req.user.id, 
      to_user_id, 
      'pass'
    );

    res.json({
      success: true,
      ...resultado
    });
  } catch (e) {
    next(e);
  }
};

/**
 * Obtener Feed de usuarios recomendados
 * GET /api/feed
 */
exports.getFeed = async (req, res, next) => {
  try {
    const opciones = {
      limite: parseInt(req.query.limite) || 20,
      filtro_nivel_min: req.query.nivel_min ? parseInt(req.query.nivel_min) : null,
      filtro_nivel_max: req.query.nivel_max ? parseInt(req.query.nivel_max) : null,
      filtro_proposito: req.query.proposito || null,
      filtro_denominacion: req.query.denominacion || null,
    };

    const perfiles = await christianMatchingService.obtenerFeedCristiano(req.user.id, opciones);
    
    res.json({
      success: true,
      perfiles,
      total: perfiles.length
    });
  } catch (e) {
    next(e);
  }
};

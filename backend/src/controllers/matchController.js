// ================================================
// ÁGAPE — Controlador de Matches (Tinder Core)
// ================================================
const matchService = require('../services/matchService');

/**
 * Obtener lista de matches del usuario
 * GET /api/matches
 */
exports.getMatches = async (req, res, next) => {
  try {
    const matches = await matchService.getMatches(req.user.id);
    
    res.json({
      success: true,
      matches,
      total: matches.length
    });
  } catch (e) {
    next(e);
  }
};

/**
 * Eliminar un match (unmatch)
 * DELETE /api/matches/:matchId
 */
exports.unmatch = async (req, res, next) => {
  try {
    const { matchId } = req.params;
    
    if (!matchId) {
      return res.status(400).json({ error: 'El ID del match es requerido.' });
    }

    const resultado = await matchService.unmatch(req.user.id, matchId);
    
    res.json({
      success: true,
      ...resultado
    });
  } catch (e) {
    next(e);
  }
};

/**
 * Obtener quién me dio like (Premium)
 * GET /api/matches/likes
 */
exports.getLikesRecibidos = async (req, res, next) => {
  try {
    const likes = await matchService.getLikes(req.user.id);
    
    res.json({
      success: true,
      likes,
      total: likes.length
    });
  } catch (e) {
    next(e);
  }
};

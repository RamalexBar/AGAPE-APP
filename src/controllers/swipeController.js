// ================================================
// ÁGAPE — Controlador de Swipes
// Reemplaza interactionController.js
// Incluye lógica de límites + anuncios + planes
// ================================================
const christianMatchingService = require('../services/christianMatchingService');
const swipeService = require('../services/swipeService');

/**
 * GET /api/feed
 * Feed de perfiles compatibles espiritualmente
 */
exports.getFeed = async (req, res, next) => {
  try {
    const opciones = {
      limite:             parseInt(req.query.limite) || 20,
      filtro_nivel_min:   req.query.nivel_min   ? parseInt(req.query.nivel_min)  : null,
      filtro_nivel_max:   req.query.nivel_max   ? parseInt(req.query.nivel_max)  : null,
      filtro_proposito:   req.query.proposito   || null,
      filtro_denominacion: req.query.denominacion || null,
    };

    const [perfiles, swipeStatus] = await Promise.all([
      christianMatchingService.obtenerFeedCristiano(req.user.id, opciones),
      swipeService.getSwipeStatus(req.user.id),
    ]);

    res.json({
      success:  true,
      perfiles,
      total:    perfiles.length,
      // Contexto de límites para el frontend
      swipe_status: {
        es_premium:       swipeStatus.es_premium,
        swipes_restantes: swipeStatus.swipes_restantes,
        anuncios_restantes: swipeStatus.anuncios_restantes ?? null,
        puede_ver_anuncio: swipeStatus.puede_ver_anuncio ?? false,
      },
    });
  } catch (e) {
    next(e);
  }
};

/**
 * POST /api/like
 * Dar like (connect) — verifica límite de swipes primero
 */
exports.like = async (req, res, next) => {
  try {
    const { to_user_id, connection_type = 'friendship' } = req.body;

    if (!to_user_id) {
      return res.status(400).json({ error: 'El ID del usuario es requerido.' });
    }

    // ── Verificar límite ──────────────────────────────────────────
    const check = await swipeService.verificarSwipe(req.user.id);

    if (!check.permitido) {
      // Devuelve showAdsOption o showPlans según corresponda
      return res.status(429).json({
        success:       false,
        limitAlcanzado: true,
        ...check,        // showAdsOption | showPlans + message
      });
    }

    // ── Procesar swipe ────────────────────────────────────────────
    const resultado = await christianMatchingService.procesarSwipeConProposito(
      req.user.id,
      to_user_id,
      'connect',
      connection_type
    );

    // Incrementar contador (solo en likes, no en dislikes)
    await swipeService.incrementarSwipe(req.user.id);

    // Devolver estado actualizado
    const nuevoStatus = await swipeService.getSwipeStatus(req.user.id);

    res.json({
      success:  true,
      ...resultado,
      swipe_status: {
        swipes_restantes:  nuevoStatus.swipes_restantes,
        anuncios_restantes: nuevoStatus.anuncios_restantes ?? null,
        puede_ver_anuncio:  nuevoStatus.puede_ver_anuncio ?? false,
      },
    });
  } catch (e) {
    next(e);
  }
};

/**
 * POST /api/dislike
 * Rechazar (pass) — NO cuenta contra el límite de swipes
 */
exports.dislike = async (req, res, next) => {
  try {
    const { to_user_id } = req.body;

    if (!to_user_id) {
      return res.status(400).json({ error: 'El ID del usuario es requerido.' });
    }

    // Dislike no verifica ni incrementa contador
    const resultado = await christianMatchingService.procesarSwipeConProposito(
      req.user.id,
      to_user_id,
      'pass'
    );

    res.json({ success: true, ...resultado });
  } catch (e) {
    next(e);
  }
};

/**
 * GET /api/swipe-status
 * Estado actual de swipes del usuario (para UI)
 */
exports.getSwipeStatus = async (req, res, next) => {
  try {
    const status = await swipeService.getSwipeStatus(req.user.id);
    res.json({ success: true, ...status });
  } catch (e) {
    next(e);
  }
};

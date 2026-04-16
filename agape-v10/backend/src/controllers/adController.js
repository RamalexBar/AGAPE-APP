// ================================================
// ÁGAPE — Controlador de Anuncios
// POST /api/watch-ad → +6 swipes
// ================================================
const swipeService = require('../services/swipeService');

/**
 * POST /api/watch-ad
 * El frontend confirma que el usuario vio un anuncio completo.
 * Incrementa ad_bonus_used y desbloquea +6 swipes.
 *
 * Seguridad:
 * - Requiere JWT (usuario autenticado)
 * - Valida que no exceda 2 anuncios por día (en el service)
 * - El frontend debe llamar este endpoint solo después de que
 *   el SDK del anuncio confirme la visualización completa
 */
exports.watchAd = async (req, res, next) => {
  try {
    const resultado = await swipeService.registrarAnuncio(req.user.id);
    res.json(resultado);
  } catch (e) {
    // 429 = ya usó el máximo de anuncios hoy
    next(e);
  }
};

/**
 * GET /api/ad-status
 * Estado de anuncios disponibles hoy (para mostrar/ocultar botón en UI)
 */
exports.getAdStatus = async (req, res, next) => {
  try {
    const status = await swipeService.getSwipeStatus(req.user.id);

    if (status.es_premium) {
      return res.json({
        success:          true,
        es_premium:       true,
        puede_ver_anuncio: false,
        message:          'Los usuarios premium no necesitan anuncios 💛',
      });
    }

    res.json({
      success:            true,
      es_premium:         false,
      puede_ver_anuncio:  status.puede_ver_anuncio,
      anuncios_usados:    status.anuncios_usados,
      anuncios_restantes: status.anuncios_restantes,
      swipes_extra_disponibles: status.anuncios_restantes * swipeService.SWIPES_POR_ANUNCIO,
      message: status.puede_ver_anuncio
        ? `Puedes ver ${status.anuncios_restantes} anuncio(s) más hoy para obtener +${status.anuncios_restantes * swipeService.SWIPES_POR_ANUNCIO} swipes`
        : 'Ya usaste todos tus anuncios de hoy',
    });
  } catch (e) {
    next(e);
  }
};

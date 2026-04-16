// src/routes/admin.js
// Rutas de administración — solo accesibles con role='admin'
const router = require('express').Router();
const { body, query } = require('express-validator');
const { validate } = require('../middlewares/validate');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');
const moderationService = require('../services/moderationService');

// Todos los endpoints requieren auth + rol admin
router.use(authenticateToken, requireAdmin);

// GET /api/admin/moderation
router.get('/moderation',
  query('status').optional().isIn(['pending', 'resolved', 'dismissed']),
  query('limite').optional().isInt({ min: 1, max: 100 }),
  validate,
  async (req, res, next) => {
    try {
      const data = await moderationService.getColaModeracion({
        status: req.query.status || 'pending',
        limite: parseInt(req.query.limite) || 50,
        offset: parseInt(req.query.offset) || 0,
      });
      res.json(data);
    } catch (e) { next(e); }
  }
);

// POST /api/admin/moderation/:reporteId/resolve
router.post('/moderation/:reporteId/resolve',
  body('accion').isIn(['dismiss', 'warn', 'suspend', 'ban']),
  body('nota_moderador').optional().isLength({ max: 500 }),
  validate,
  async (req, res, next) => {
    try {
      const resultado = await moderationService.resolverReporte(
        req.params.reporteId,
        req.user.id,
        req.body
      );
      res.json(resultado);
    } catch (e) { next(e); }
  }
);

// GET /api/admin/stats
router.get('/stats', async (req, res, next) => {
  try {
    res.json(await moderationService.getEstadisticas());
  } catch (e) { next(e); }
});

module.exports = router;

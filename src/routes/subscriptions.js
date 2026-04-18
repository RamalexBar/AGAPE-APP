// src/routes/subscriptions.js — IAP + Suscripciones + Monedas
const router = require('express').Router();
const { body } = require('express-validator');
const { validate } = require('../middlewares/validate');
const { authenticateToken } = require('../middlewares/auth');
const iapService = require('../services/iapService');
const {
  obtenerSuscripcion, verificarLimite,
  PLANES, PAQUETES_MONEDAS, TIENDA_MONEDAS, comprarConMonedas, getRevenueStats,
} = require('../services/monetizationAgapeService');
const { requireAdmin } = require('../middlewares/auth');

// GET /api/subscriptions/status
router.get('/status', authenticateToken, async (req, res, next) => {
  try { res.json({ success: true, ...(await obtenerSuscripcion(req.user.id)) }); }
  catch (e) { next(e); }
});

// GET /api/subscriptions/plans
router.get('/plans', (req, res) => {
  res.json({
    success: true,
    planes: Object.values(PLANES).map(p => ({
      id: p.id, nombre: p.nombre, emoji: p.emoji, color: p.color,
      descripcion: p.descripcion,
      precio_mensual_cop: p.precio_mensual_cop,
      precio_anual_cop: p.precio_anual_cop,
      beneficios: p.beneficios,
      apple_product_id: p.apple_product_id,
      google_product_id: p.google_product_id,
      apple_annual_id: p.apple_annual_id,
      google_annual_id: p.google_annual_id,
    })),
    paquetes_monedas: PAQUETES_MONEDAS,
    tienda_monedas: Object.values(TIENDA_MONEDAS),
  });
});

// POST /api/subscriptions/purchase — validar y activar compra IAP
router.post('/purchase', authenticateToken,
  body('plataforma').isIn(['apple', 'google']),
  body('product_id').notEmpty(),
  body('receipt_or_token').notEmpty(),
  validate,
  async (req, res, next) => {
    try { res.json({ success: true, ...(await iapService.procesarCompra(req.user.id, req.body)) }); }
    catch (e) { next(e); }
  }
);

// POST /api/subscriptions/restore — restaurar (Apple lo exige)
router.post('/restore', authenticateToken,
  body('plataforma').isIn(['apple', 'google']),
  body('product_id').notEmpty(),
  body('receipt_or_token').notEmpty(),
  validate,
  async (req, res, next) => {
    try { res.json({ success: true, ...(await iapService.restaurarCompras(req.user.id, req.body)) }); }
    catch (e) { next(e); }
  }
);

// GET /api/subscriptions/coins — saldo de monedas
router.get('/coins', authenticateToken, async (req, res, next) => {
  try {
    const sub = await obtenerSuscripcion(req.user.id);
    res.json({ success: true, monedas_fe: sub.monedas_fe, tienda: Object.values(TIENDA_MONEDAS) });
  } catch (e) { next(e); }
});

// POST /api/subscriptions/coins/spend — gastar monedas
router.post('/coins/spend', authenticateToken,
  body('item_id').notEmpty().isIn(Object.keys(TIENDA_MONEDAS)),
  validate,
  async (req, res, next) => {
    try { res.json({ success: true, ...(await comprarConMonedas(req.user.id, req.body.item_id)) }); }
    catch (e) { next(e); }
  }
);

// GET /api/subscriptions/check/:action — verificar si puede hacer una acción
router.get('/check/:action', authenticateToken, async (req, res, next) => {
  try { res.json({ success: true, ...(await verificarLimite(req.user.id, req.params.action)) }); }
  catch (e) { next(e); }
});

// GET /api/subscriptions/revenue — stats admin
router.get('/revenue', authenticateToken, requireAdmin, async (req, res, next) => {
  try { res.json({ success: true, ...(await getRevenueStats()) }); }
  catch (e) { next(e); }
});

module.exports = router;

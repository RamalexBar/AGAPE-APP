// ================================================
// ÁGAPE — Rutas: Interacciones + Swipes + Anuncios
// /api/*
// ================================================
const express = require('express');
const router  = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middlewares/validate');
const { authenticateToken } = require('../middlewares/auth');
const swipeController = require('../controllers/swipeController');
const adController    = require('../controllers/adController');

// ── Feed ───────────────────────────────────────────────────────────
// GET /api/feed
router.get('/feed', authenticateToken, swipeController.getFeed);

// ── Swipes ─────────────────────────────────────────────────────────
// POST /api/like
router.post('/like',
  authenticateToken,
  body('to_user_id').notEmpty().withMessage('to_user_id requerido.'),
  body('connection_type').optional().isIn(['friendship', 'community', 'marriage']),
  validate,
  swipeController.like
);

// POST /api/dislike
router.post('/dislike',
  authenticateToken,
  body('to_user_id').notEmpty().withMessage('to_user_id requerido.'),
  validate,
  swipeController.dislike
);

// GET /api/swipe-status
// Estado actual de swipes (para mostrar contador en UI)
router.get('/swipe-status', authenticateToken, swipeController.getSwipeStatus);

// ── Anuncios ───────────────────────────────────────────────────────
// POST /api/watch-ad
// Confirmar que el usuario vio un anuncio → +6 swipes
router.post('/watch-ad', authenticateToken, adController.watchAd);

// GET /api/ad-status
// Cuántos anuncios puede ver hoy
router.get('/ad-status', authenticateToken, adController.getAdStatus);

module.exports = router;

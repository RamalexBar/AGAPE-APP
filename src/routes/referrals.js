// src/routes/referrals.js
const router = require('express').Router();
const { authenticateToken } = require('../middlewares/auth');
const referralController = require('../controllers/referralController');

// GET /api/referrals/code   → mi código de invitación
router.get('/code',     authenticateToken, referralController.getMiCodigo);

// GET /api/referrals/history → historial de personas que invité
router.get('/history',  authenticateToken, referralController.getHistorial);

module.exports = router;

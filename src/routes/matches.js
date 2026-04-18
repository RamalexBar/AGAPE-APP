// ================================================
// ÁGAPE — Rutas: Matches (Tinder Core)
// /api/matches/*
// ================================================
const express = require('express');
const router  = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const matchController = require('../controllers/matchController');

// GET /api/matches
// Lista de conexiones del usuario
router.get('/', authenticateToken, matchController.getMatches);

// GET /api/matches/likes
// Quién me dio like/connect (requiere premium)
router.get('/likes', authenticateToken, matchController.getLikesRecibidos);

// DELETE /api/matches/:matchId
// Desconectar (unmatch)
router.delete('/:matchId', authenticateToken, matchController.unmatch);

module.exports = router;

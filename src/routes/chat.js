// src/routes/chat.js
const router = require('express').Router();
const { body, query } = require('express-validator');
const { validate } = require('../middlewares/validate');
const { authenticateToken } = require('../middlewares/auth');
const chatService = require('../services/chatService');

// GET /api/chat
// Lista de conversaciones del usuario
router.get('/', authenticateToken, async (req, res, next) => {
  try { res.json(await chatService.getConversations(req.user.id)); }
  catch (e) { next(e); }
});

// POST /api/chat/conversation/:userId
// Crear o recuperar conversación con otro usuario
router.post('/conversation/:userId', authenticateToken, async (req, res, next) => {
  try {
    const result = await chatService.getOrCreateConversation(req.user.id, req.params.userId);
    res.status(result.nueva ? 201 : 200).json(result);
  } catch (e) { next(e); }
});

// GET /api/chat/:conversationId/messages
// Historial de mensajes (paginado por cursor)
router.get('/:conversationId/messages',
  authenticateToken,
  query('limite').optional().isInt({ min: 1, max: 100 }),
  validate,
  async (req, res, next) => {
    try {
      const msgs = await chatService.getMessages(req.user.id, req.params.conversationId, {
        limite: parseInt(req.query.limite) || 50,
        antes_de: req.query.antes_de || null,
      });
      res.json(msgs);
    } catch (e) { next(e); }
  }
);

// POST /api/chat/:conversationId/messages
// Enviar mensaje (fallback HTTP — en producción preferir Socket.IO)
router.post('/:conversationId/messages',
  authenticateToken,
  body('content').trim().notEmpty().withMessage('Mensaje vacío.').isLength({ max: 2000 }),
  body('tipo').optional().isIn(['text', 'image', 'audio', 'verse']),
  validate,
  async (req, res, next) => {
    try {
      const msg = await chatService.sendMessage(req.user.id, req.params.conversationId, req.body);
      res.status(201).json(msg);
    } catch (e) { next(e); }
  }
);

module.exports = router;

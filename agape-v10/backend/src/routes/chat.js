// src/routes/chat.js
const router = require('express').Router();
const { body, query } = require('express-validator');
const { validate } = require('../middlewares/validate');
const { authenticateToken } = require('../middlewares/auth');
const chatService = require('../services/chatService');
const supabase = require('../config/supabase');

// El frontend identifica los chats por "match_id" (id de la tabla `connections`),
// pero los mensajes viven en `conversations`. Esta función resuelve/crea la
// conversación real a partir del match_id, de forma transparente.
async function resolverConversacion(matchId, userId) {
  const { data: conn } = await supabase
    .from('connections')
    .select('user_id_1, user_id_2')
    .eq('id', matchId)
    .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`)
    .single();

  if (!conn) throw Object.assign(new Error('Match no encontrado.'), { status: 404 });

  const otroId = conn.user_id_1 === userId ? conn.user_id_2 : conn.user_id_1;
  const { conversation_id } = await chatService.getOrCreateConversation(userId, otroId);
  return conversation_id;
}

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

// GET /api/chat/:matchId/messages
// Historial de mensajes (paginado por cursor) — matchId = id de connections
router.get('/:matchId/messages',
  authenticateToken,
  query('limite').optional().isInt({ min: 1, max: 100 }),
  validate,
  async (req, res, next) => {
    try {
      const conversationId = await resolverConversacion(req.params.matchId, req.user.id);
      const mensajes = await chatService.getMessages(req.user.id, conversationId, {
        limite: parseInt(req.query.limite) || 50,
        antes_de: req.query.antes_de || null,
      });
      res.json({ mensajes });
    } catch (e) { next(e); }
  }
);

// POST /api/chat/:matchId/messages
// Enviar mensaje (fallback HTTP — en producción preferir Socket.IO) — matchId = id de connections
router.post('/:matchId/messages',
  authenticateToken,
  body('content').trim().notEmpty().withMessage('Mensaje vacío.').isLength({ max: 2000 }),
  body('tipo').optional().isIn(['text', 'image', 'audio', 'verse']),
  validate,
  async (req, res, next) => {
    try {
      const conversationId = await resolverConversacion(req.params.matchId, req.user.id);
      const msg = await chatService.sendMessage(req.user.id, conversationId, req.body);
      res.status(201).json({ mensaje: msg });
    } catch (e) { next(e); }
  }
);

module.exports = router;
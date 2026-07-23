// ================================================
// ÁGAPE — Rutas: Señalización de videollamadas
// /api/videocall/*
// NOTA: no integra un SFU real (Agora/etc). Solo coordina
// la señalización (quién llama, canal, aceptar/rechazar/colgar)
// vía Socket.IO; el cliente cae a "modo demo" si no hay motor
// de video instalado (ver frontend VideoCallScreen.js).
// ================================================
const router = require('express').Router();
const { body } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { validate } = require('../middlewares/validate');
const { authenticateToken } = require('../middlewares/auth');
const supabase = require('../config/supabase');

async function obtenerOtroParticipante(matchId, userId) {
  const { data: conn } = await supabase
    .from('connections')
    .select('user_id_1, user_id_2')
    .eq('id', matchId)
    .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`)
    .single();
  if (!conn) return null;
  return conn.user_id_1 === userId ? conn.user_id_2 : conn.user_id_1;
}

// POST /api/videocall/iniciar
router.post('/iniciar', authenticateToken,
  body('match_id').notEmpty(),
  validate,
  async (req, res, next) => {
    try {
      const { match_id } = req.body;
      const otroId = await obtenerOtroParticipante(match_id, req.user.id);
      if (!otroId) return res.status(404).json({ error: 'Match no encontrado.' });

      const llamada_id = uuidv4();
      const canal = `call_${match_id}_${Date.now()}`;

      const { data: llamador } = await supabase.from('users').select('nombre').eq('id', req.user.id).single();

      if (global.io) {
        global.io.to('user_' + otroId).emit('videocall_incoming', {
          llamada_id, match_id, canal, de: llamador?.nombre || 'Alguien',
        });
      }

      res.json({ llamada_id, canal, app_id: null, token: null, uid: null });
    } catch (e) { next(e); }
  }
);

// POST /api/videocall/responder/:id — aceptar o rechazar una llamada entrante
router.post('/responder/:id', authenticateToken,
  body('match_id').notEmpty(),
  body('accion').isIn(['aceptar', 'rechazar']),
  validate,
  async (req, res, next) => {
    try {
      const { match_id, accion } = req.body;
      const otroId = await obtenerOtroParticipante(match_id, req.user.id);
      if (!otroId) return res.status(404).json({ error: 'Match no encontrado.' });

      if (global.io) {
        global.io.to('user_' + otroId).emit('videocall_respuesta', {
          llamada_id: req.params.id, match_id, accion, de: req.user.id,
        });
      }

      res.json({ llamada_id: req.params.id, accion, token: null, uid: null });
    } catch (e) { next(e); }
  }
);

// POST /api/videocall/finalizar/:id
router.post('/finalizar/:id', authenticateToken,
  body('match_id').optional(),
  validate,
  async (req, res, next) => {
    try {
      const { match_id } = req.body;
      if (match_id && global.io) {
        const otroId = await obtenerOtroParticipante(match_id, req.user.id);
        if (otroId) {
          global.io.to('user_' + otroId).emit('videocall_finalizada', {
            llamada_id: req.params.id, match_id, de: req.user.id,
          });
        }
      }
      res.json({ success: true });
    } catch (e) { next(e); }
  }
);

module.exports = router;

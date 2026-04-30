// ================================================
// ÁGAPE — Socket Handler PRO v3
// Presencia online/offline, typing, read receipts, push fallback
// ================================================
const { Server }  = require('socket.io');
const jwt         = require('jsonwebtoken');
const supabase    = require('../config/supabase');
const { actualizarActividad } = require('../services/presenceService');
const notificationService     = require('../services/notificationService');

module.exports = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL
        ? [process.env.FRONTEND_URL, 'exp://localhost:8081']
        : ['http://localhost:3000', 'exp://localhost:8081'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 30000,
    pingInterval: 10000,
    transports: ['websocket', 'polling'],
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Token requerido.'));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = payload.sub;
      next();
    } catch { next(new Error('Token inválido.')); }
  });

  global.onlineUsers = global.onlineUsers || new Map();
  const isOnline = (uid) => global.onlineUsers.has(uid) && global.onlineUsers.get(uid).size > 0;

  io.on('connection', async (socket) => {
    const { userId } = socket;
    if (!global.onlineUsers.has(userId)) global.onlineUsers.set(userId, new Set());
    global.onlineUsers.get(userId).add(socket.id);
    socket.join('user_' + userId);
    actualizarActividad(userId).catch(() => {});

    const { data: misMatches } = await supabase
      .from('connections')
      .select('user_id_1, user_id_2')
      .or('user_id_1.eq.' + userId + ',user_id_2.eq.' + userId)
      .eq('status', 'connected');

    (misMatches || []).forEach(conn => {
      const otroId = conn.user_id_1 === userId ? conn.user_id_2 : conn.user_id_1;
      io.to('user_' + otroId).emit('user_online', { userId, online: true });
    });

    socket.on('join_conversation', async ({ conversationId }) => {
      const { data } = await supabase
        .from('conversations').select('id')
        .eq('id', conversationId)
        .or('user_id_1.eq.' + userId + ',user_id_2.eq.' + userId)
        .single();
      if (!data) return socket.emit('error', { code: 'CONV_NOT_FOUND', mensaje: 'Conversación no encontrada.' });
      socket.join('conv_' + conversationId);
      socket.emit('joined_conversation', { conversationId });
    });

    socket.on('send_message', async ({ conversationId, content, tipo = 'text', media_url = null }) => {
      try {
        if (tipo === 'text' && !content?.trim())
          return socket.emit('error', { code: 'EMPTY_MSG', mensaje: 'Mensaje vacío.' });
        if ((content?.length || 0) > 2000)
          return socket.emit('error', { code: 'MSG_TOO_LONG', mensaje: 'Mensaje demasiado largo.' });

        const { data: conv } = await supabase.from('conversations').select('id, user_id_1, user_id_2')
          .eq('id', conversationId)
          .or('user_id_1.eq.' + userId + ',user_id_2.eq.' + userId)
          .single();
        if (!conv) return socket.emit('error', { code: 'CONV_NOT_FOUND', mensaje: 'Conversación no encontrada.' });

        const { data: msg, error } = await supabase.from('messages')
          .insert({ conversation_id: conversationId, sender_id: userId, content: content?.trim(), tipo, media_url })
          .select().single();
        if (error) throw error;

        await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversationId);
        io.to('conv_' + conversationId).emit('new_message', msg);

        const destId = conv.user_id_1 === userId ? conv.user_id_2 : conv.user_id_1;
        if (!isOnline(destId)) {
          const { data: sender } = await supabase.from('users').select('nombre').eq('id', userId).single();
          notificationService.notificarNuevoMensaje(destId, { nombreDe: sender?.nombre||'...', preview: content?.trim()||'' }).catch(() => {});
        }
      } catch (err) {
        console.error('[Socket] send_message:', err.message);
        socket.emit('error', { code: 'SEND_FAILED', mensaje: 'Error al enviar mensaje.' });
      }
    });

    socket.on('typing_start', ({ conversationId }) => {
      socket.to('conv_' + conversationId).emit('user_typing', { userId, conversationId });
    });
    socket.on('typing_stop', ({ conversationId }) => {
      socket.to('conv_' + conversationId).emit('user_stopped_typing', { userId, conversationId });
    });

    socket.on('mark_read', async ({ conversationId }) => {
      try {
        const now = new Date().toISOString();
        await supabase.from('messages')
          .update({ read_at: now })
          .eq('conversation_id', conversationId)
          .neq('sender_id', userId)
          .is('read_at', null);
        io.to('conv_' + conversationId).emit('messages_read', { conversationId, read_by: userId, read_at: now });
      } catch (err) { console.error('[Socket] mark_read:', err.message); }
    });

    socket.on('register_push_token', async ({ token, plataforma = 'android' }) => {
      if (token) notificationService.registrarToken(userId, token, plataforma).catch(() => {});
    });

    socket.on('disconnect', async () => {
      const sockets = global.onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          global.onlineUsers.delete(userId);
          (misMatches || []).forEach(conn => {
            const otroId = conn.user_id_1 === userId ? conn.user_id_2 : conn.user_id_1;
            io.to('user_' + otroId).emit('user_online', { userId, online: false });
          });
        }
      }
      actualizarActividad(userId).catch(() => {});
    });
  });

  global.io = io;
  return io;
};

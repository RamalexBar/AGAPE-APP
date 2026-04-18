// src/services/chatService.js
const supabase = require('../config/supabase');

/**
 * Obtener conversaciones del usuario (lista de chats)
 */
const getConversations = async (userId) => {
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      id, created_at, last_message_at,
      participant1:user_id_1(id, nombre, avatar_url, last_active_at),
      participant2:user_id_2(id, nombre, avatar_url, last_active_at),
      messages(content, created_at, sender_id)
    `)
    .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`)
    .order('last_message_at', { ascending: false })
    .limit(50);

  if (error) throw Object.assign(new Error('Error al obtener conversaciones.'), { status: 500 });

  return (data || []).map(conv => {
    const otro = conv.participant1?.id === userId ? conv.participant2 : conv.participant1;
    const ultimoMensaje = conv.messages?.[0] || null;
    return {
      conversation_id: conv.id,
      last_message_at: conv.last_message_at,
      usuario: otro,
      ultimo_mensaje: ultimoMensaje
        ? { texto: ultimoMensaje.content, es_mio: ultimoMensaje.sender_id === userId }
        : null,
    };
  });
};

/**
 * Obtener mensajes de una conversación
 */
const getMessages = async (userId, conversationId, { limite = 50, antes_de = null }) => {
  // Verificar que el usuario pertenece a la conversación
  const { data: conv } = await supabase
    .from('conversations')
    .select('id')
    .eq('id', conversationId)
    .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`)
    .single();

  if (!conv) throw Object.assign(new Error('Conversación no encontrada.'), { status: 404 });

  let query = supabase
    .from('messages')
    .select('id, content, sender_id, created_at, tipo, media_url')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limite);

  if (antes_de) query = query.lt('created_at', antes_de);

  const { data, error } = await query;
  if (error) throw Object.assign(new Error('Error al obtener mensajes.'), { status: 500 });

  return (data || []).reverse(); // orden cronológico
};

/**
 * Enviar mensaje HTTP (fallback cuando Socket.IO no está disponible)
 */
const sendMessage = async (userId, conversationId, { content, tipo = 'text', media_url = null }) => {
  // Verificar pertenencia a conversación
  const { data: conv } = await supabase
    .from('conversations')
    .select('id, user_id_1, user_id_2')
    .eq('id', conversationId)
    .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`)
    .single();

  if (!conv) throw Object.assign(new Error('Conversación no encontrada.'), { status: 404 });

  const { data: msg, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: userId,
      content,
      tipo,
      media_url,
    })
    .select()
    .single();

  if (error) throw Object.assign(new Error('Error al enviar mensaje.'), { status: 500 });

  // Actualizar timestamp de última actividad en la conversación
  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId);

  return msg;
};

/**
 * Crear conversación entre dos usuarios (si no existe)
 */
const getOrCreateConversation = async (userId, otroUserId) => {
  // Buscar conversación existente
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .or(
      `and(user_id_1.eq.${userId},user_id_2.eq.${otroUserId}),and(user_id_1.eq.${otroUserId},user_id_2.eq.${userId})`
    )
    .single();

  if (existing) return { conversation_id: existing.id, nueva: false };

  const { data: nueva, error } = await supabase
    .from('conversations')
    .insert({ user_id_1: userId, user_id_2: otroUserId })
    .select()
    .single();

  if (error) throw Object.assign(new Error('Error al crear conversación.'), { status: 500 });

  return { conversation_id: nueva.id, nueva: true };
};

module.exports = { getConversations, getMessages, sendMessage, getOrCreateConversation };

// src/services/matchService.js
const supabase = require('../config/supabase');

/**
 * Obtener lista de matches del usuario
 */
const getMatches = async (userId) => {
  const { data, error } = await supabase
    .from('connections')
    .select(`
      id, connection_type, connected_at,
      user1:user_id_1(id, nombre, avatar_url, is_verified),
      user2:user_id_2(id, nombre, avatar_url, is_verified)
    `)
    .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`)
    .eq('status', 'connected')
    .order('connected_at', { ascending: false });

  if (error) throw Object.assign(new Error('Error al obtener matches.'), { status: 500 });

  return (data || []).map(conn => {
    const match = conn.user1?.id === userId ? conn.user2 : conn.user1;
    return {
      match_id: conn.id,
      connection_type: conn.connection_type,
      connected_at: conn.connected_at,
      usuario: match,
    };
  });
};

/**
 * Obtener quién me dio like (requiere plan premium)
 */
const getLikes = async (userId) => {
  const { data } = await supabase
    .from('swipes')
    .select(`
      from_user_id, connection_type, created_at,
      from_user:from_user_id(id, nombre, avatar_url)
    `)
    .eq('to_user_id', userId)
    .eq('action', 'connect')
    .order('created_at', { ascending: false })
    .limit(50);

  return data || [];
};

/**
 * Deshacer último swipe (rewind — premium)
 */
const rewindLastSwipe = async (userId) => {
  const { data: ultimo } = await supabase
    .from('swipes')
    .select('id, to_user_id')
    .eq('from_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!ultimo) throw Object.assign(new Error('No hay swipe para deshacer.'), { status: 404 });

  await supabase.from('swipes').delete().eq('id', ultimo.id);

  return { mensaje: 'Último swipe deshecho.', to_user_id: ultimo.to_user_id };
};

/**
 * Super conexión (destacada — premium)
 */
const superConnect = async (fromUserId, toUserId) => {
  const { error } = await supabase
    .from('swipes')
    .upsert({
      from_user_id: fromUserId,
      to_user_id: toUserId,
      action: 'super_connect',
      connection_type: 'special',
    });

  if (error) throw Object.assign(new Error('Error al enviar super conexión.'), { status: 500 });

  // Notificar al receptor (se puede conectar con push notifications aquí)
  return { mensaje: '¡Super conexión enviada! 💛', enviado: true };
};

/**
 * Desconectar (unmatch)
 */
const unmatch = async (userId, matchId) => {
  const { data: conn } = await supabase
    .from('connections')
    .select('id')
    .eq('id', matchId)
    .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`)
    .single();

  if (!conn) throw Object.assign(new Error('Conexión no encontrada.'), { status: 404 });

  await supabase.from('connections').delete().eq('id', matchId);
  return { mensaje: 'Conexión eliminada.' };
};

module.exports = { getMatches, getLikes, rewindLastSwipe, superConnect, unmatch };

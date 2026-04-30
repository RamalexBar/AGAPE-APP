// ================================================
// ÁGAPE — Servicio de Interés Oculto
// "X personas quieren conocerte" — desbloq. con Premium
// ================================================
const supabase = require('../config/supabase');

/**
 * Obtener conteo de likes recibidos (sin revelar quién)
 * FREE → solo número + motivación para upgrade
 * PREMIUM → lista completa de perfiles
 */
const getInteresOculto = async (userId, esPremium = false) => {
  // Mascotas propias del usuario
  const haceUnaSemana = new Date(Date.now() - 7 * 86400000).toISOString();

  const { data: likesRecibidos, count } = await supabase
    .from('swipes')
    .select('from_user_id, created_at, connection_type', { count: 'exact' })
    .eq('to_user_id', userId)
    .eq('action', 'connect')
    .gte('created_at', haceUnaSemana)
    .order('created_at', { ascending: false });

  const total = count || 0;

  if (!esPremium) {
    // FREE: solo el número, motivación emocional
    const mensajes = [
      `${total} persona${total !== 1 ? 's' : ''} quiere${total !== 1 ? 'n' : ''} conocerte`,
      `Hay ${total} corazón${total !== 1 ? 'es' : ''} esperando tu respuesta`,
      `${total} persona${total !== 1 ? 's' : ''} vio tu perfil y le encantó`,
    ];
    const idx = Math.floor(Date.now() / 3600000) % mensajes.length; // rota cada hora
    return {
      total,
      es_premium: false,
      mensaje_motivacion: total > 0
        ? mensajes[idx]
        : 'Completa tu perfil para aparecer más en el feed',
      accion: total > 0 ? 'UPGRADE_TO_SEE' : 'COMPLETE_PROFILE',
      perfiles: null, // no se revelan
    };
  }

  // PREMIUM: perfiles reales
  const fromIds = (likesRecibidos || []).map(l => l.from_user_id);
  if (!fromIds.length) return { total: 0, es_premium: true, perfiles: [] };

  const { data: perfiles } = await supabase
    .from('users')
    .select('id, nombre, edad, avatar_url, denomination, connection_purpose, last_active_at')
    .in('id', fromIds)
    .eq('is_active', true)
    .eq('is_banned', false);

  return {
    total,
    es_premium: true,
    mensaje_motivacion: null,
    accion: null,
    perfiles: (perfiles || []).map(p => {
      const like = likesRecibidos.find(l => l.from_user_id === p.id);
      return { ...p, liked_at: like?.created_at, connection_type: like?.connection_type };
    }),
  };
};

/**
 * Registrar que alguien vio el perfil (para "X personas vieron tu perfil")
 */
const registrarVistasPerfil = async (viewerId, targetUserId) => {
  if (viewerId === targetUserId) return;
  await supabase.from('profile_views').upsert({
    viewer_id:  viewerId,
    target_id:  targetUserId,
    viewed_at:  new Date().toISOString(),
  }, { onConflict: 'viewer_id,target_id' }).catch(() => {});
};

/**
 * Contar vistas de perfil en las últimas 24h
 */
const getVistasPerfil = async (userId) => {
  const hace24h = new Date(Date.now() - 86400000).toISOString();
  const { count } = await supabase
    .from('profile_views')
    .select('id', { count: 'exact', head: true })
    .eq('target_id', userId)
    .gte('viewed_at', hace24h);
  return count || 0;
};

module.exports = { getInteresOculto, registrarVistasPerfil, getVistasPerfil };

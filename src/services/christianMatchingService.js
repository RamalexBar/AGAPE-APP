// ================================================
// ÁGAPE — Matching Cristiano Inteligente v3
// Afinidad espiritual + intereses + actividad reciente
// Solo muestra usuarios activos en el feed
// ================================================
const supabase = require('../config/supabase');
const { getMensajeMatch, MENSAJES_COMPATIBILIDAD } = require('./emotionalMessagesService');
const { calcularEstado } = require('./presenceService');
const notificationService = require('./notificationService');

const PESOS = {
  nivel_espiritual:     0.20,
  proposito_conexion:   0.20,
  denominacion:         0.12,
  habitos_espirituales: 0.18,
  valores_personales:   0.15,
  intereses_comunes:    0.10,
  actividad_reciente:   0.05,
};

const calcularCompatibilidad = (A, B) => {
  let score = 0;
  const d = {};

  const sNivel = Math.max(0, 1 - Math.abs((A.nivel||1)-(B.nivel||1)) * 0.2);
  score += sNivel * PESOS.nivel_espiritual;
  d.nivel_espiritual = Math.round(sNivel * 100);

  const pA = A.connection_purpose || 'friendship', pB = B.connection_purpose || 'friendship';
  const sProp = pA===pB ? 1 : (pA==='friendship'||pB==='friendship' ? 0.5 : 0);
  score += sProp * PESOS.proposito_conexion;
  d.proposito = Math.round(sProp * 100);

  const dA = A.denomination||'christian', dB = B.denomination||'christian';
  const sDen = dA===dB ? 1 : (dA==='christian'||dB==='christian' ? 0.6 : 0.3);
  score += sDen * PESOS.denominacion;
  d.denominacion = Math.round(sDen * 100);

  const hA = A.spiritual_habits||{}, hB = B.spiritual_habits||{};
  const fA = (hA.devotional_frequency||0)+(hA.prayer_frequency||0);
  const fB = (hB.devotional_frequency||0)+(hB.prayer_frequency||0);
  const sHab = Math.max(0, 1 - Math.abs(fA-fB)/10);
  score += sHab * PESOS.habitos_espirituales;
  d.habitos = Math.round(sHab * 100);

  const vA = new Set(A.valores||[]), vB = new Set(B.valores||[]);
  const interV = [...vA].filter(v=>vB.has(v)).length;
  const unionV = new Set([...vA,...vB]).size;
  const sVal = unionV > 0 ? interV/unionV : 0.5;
  score += sVal * PESOS.valores_personales;
  d.valores = Math.round(sVal * 100);

  const iA = new Set(A.intereses||[]), iB = new Set(B.intereses||[]);
  const interI = [...iA].filter(i=>iB.has(i)).length;
  const unionI = new Set([...iA,...iB]).size;
  const sInt = unionI > 0 ? interI/unionI : 0.3;
  score += sInt * PESOS.intereses_comunes;
  d.intereses = Math.round(sInt * 100);

  const msInact = B.last_active_at ? Date.now()-new Date(B.last_active_at).getTime() : 30*86400000;
  const sAct = Math.max(0, 1 - (msInact/86400000)/30);
  score += sAct * PESOS.actividad_reciente;
  d.actividad = Math.round(sAct * 100);

  const pct = Math.round(score*100);
  return {
    score_total: pct,
    detalles: d,
    es_compatible: score >= 0.40,
    label_emocional: MENSAJES_COMPATIBILIDAD(pct),
  };
};

const obtenerFeedCristiano = async (userId, opciones = {}) => {
  const {
    limite=20, filtro_nivel_min=null, filtro_nivel_max=null,
    filtro_proposito=null, filtro_denominacion=null, solo_activos=true,
  } = opciones;

  const { data: yo } = await supabase
    .from('users')
    .select('id, nivel, connection_purpose, denomination, spiritual_habits, valores, last_active_at, profiles(intereses)')
    .eq('id', userId).single();

  if (!yo) throw new Error('Perfil no encontrado');
  yo.intereses = yo.profiles?.intereses || [];

  const [{ data: yaVistos }, { data: bloqueados }] = await Promise.all([
    supabase.from('swipes').select('to_user_id').eq('from_user_id', userId),
    supabase.from('blocked_users').select('blocked_id').eq('blocker_id', userId),
  ]);

  const excluir = new Set([userId, ...(yaVistos||[]).map(s=>s.to_user_id), ...(bloqueados||[]).map(b=>b.blocked_id)]);
  const excStr = [...excluir].join(',') || "'00000000-0000-0000-0000-000000000000'";
  const corte = solo_activos ? new Date(Date.now()-72*3600000).toISOString() : null;

  let q = supabase
    .from('users')
    .select('id, nombre, edad, avatar_url, bio, ubicacion_ciudad, nivel, connection_purpose, denomination, spiritual_habits, valores, last_active_at, is_verified, is_faith_verified, spiritual_profiles(total_xp, nivel, racha_devocional), profiles(fotos, intereses)')
    .eq('is_active', true).eq('is_banned', false)
    .not('id', 'in', `(${excStr})`);

  if (corte) q = q.gte('last_active_at', corte);
  if (filtro_nivel_min) q = q.gte('nivel', filtro_nivel_min);
  if (filtro_nivel_max) q = q.lte('nivel', filtro_nivel_max);
  if (filtro_proposito) q = q.eq('connection_purpose', filtro_proposito);
  if (filtro_denominacion) q = q.eq('denomination', filtro_denominacion);

  const { data: candidatos } = await q.limit(200);
  if (!candidatos?.length) return [];

  return candidatos
    .map(c => { c.intereses = c.profiles?.intereses||[]; return { ...c, compatibilidad: calcularCompatibilidad(yo,c), presencia: calcularEstado(c.last_active_at) }; })
    .filter(p => p.compatibilidad.es_compatible)
    .sort((a,b) => { if(a.presencia.online!==b.presencia.online) return a.presencia.online?-1:1; return b.compatibilidad.score_total-a.compatibilidad.score_total; })
    .slice(0, limite)
    .map(p => ({
      id: p.id, nombre: p.nombre, edad: p.edad, avatar_url: p.avatar_url,
      bio: p.bio, ubicacion_ciudad: p.ubicacion_ciudad,
      nivel_espiritual: { nivel: p.spiritual_profiles?.nivel||1, xp: p.spiritual_profiles?.total_xp||0, racha: p.spiritual_profiles?.racha_devocional||0 },
      proposito_conexion: p.connection_purpose, denominacion: p.denomination,
      is_verified: p.is_verified, is_faith_verified: p.is_faith_verified,
      fotos: p.profiles?.fotos||[], intereses: p.intereses,
      compatibilidad: p.compatibilidad, presencia: p.presencia,
    }));
};

const procesarSwipeConProposito = async (fromUserId, toUserId, accion, tipoProposito = 'friendship') => {
  const { error } = await supabase.from('swipes').upsert({ from_user_id: fromUserId, to_user_id: toUserId, action: accion, connection_type: tipoProposito });
  if (error) throw error;
  if (accion !== 'connect') return { es_conexion: false };

  const { data: fromUser } = await supabase.from('users').select('nombre, avatar_url').eq('id', fromUserId).single();
  notificationService.notificarNuevoLike(toUserId, { nombreDe: fromUser?.nombre||'Alguien' }).catch(()=>{});

  const { data: inverso } = await supabase.from('swipes').select('id').eq('from_user_id', toUserId).eq('to_user_id', fromUserId).eq('action', 'connect').single();
  if (!inverso) return { es_conexion: false };

  const { data: conexion } = await supabase.from('connections')
    .insert({ user_id_1: fromUserId, user_id_2: toUserId, status: 'connected', connection_type: tipoProposito, initiated_by: fromUserId, connected_at: new Date().toISOString() })
    .select().single();

  const { data: usuarios } = await supabase.from('users').select('id, nombre, avatar_url').in('id', [fromUserId, toUserId]);
  const resultado = {
    es_conexion: true, conexion, usuarios,
    mensaje: getMensajeMatch(tipoProposito),
    tipo: tipoProposito
  };

  if (global.io) {
    global.io.to(`user_${fromUserId}`).emit('new_match', resultado);
    global.io.to(`user_${toUserId}`).emit('new_match', resultado);
  }

  const otro = usuarios?.find(u=>u.id!==fromUserId);
  const yo_  = usuarios?.find(u=>u.id===fromUserId);
  Promise.all([
    notificationService.notificarNuevoMatch(toUserId,   { nombreOtro: yo_?.nombre,  tipo: tipoProposito }),
    notificationService.notificarNuevoMatch(fromUserId, { nombreOtro: otro?.nombre, tipo: tipoProposito }),
  ]).catch(()=>{});

  return resultado;
};

module.exports = { calcularCompatibilidad, obtenerFeedCristiano, procesarSwipeConProposito, PESOS };

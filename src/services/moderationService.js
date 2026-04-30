// src/services/moderationService.js
// Sistema de moderación: revisión de reportes, baneos, advertencias
const supabase = require('../config/supabase');

const AUTO_BAN_THRESHOLD = 5; // banear automáticamente tras N reportes confirmados

// ── Obtener cola de moderación ────────────────────────────────────
const getColaModeracion = async ({ status = 'pending', limite = 50, offset = 0 } = {}) => {
  const { data, count } = await supabase
    .from('reports')
    .select(`
      id, razon, descripcion, status, created_at,
      reporter:reporter_id(id, nombre, email),
      reported:reported_id(id, nombre, email, is_banned, avatar_url)
    `, { count: 'exact' })
    .eq('status', status)
    .order('created_at', { ascending: true })
    .range(offset, offset + limite - 1);

  return { reportes: data || [], total: count || 0 };
};

// ── Resolver un reporte ────────────────────────────────────────────
const resolverReporte = async (reporteId, moderadorId, { accion, nota_moderador }) => {
  // accion: 'dismiss' | 'warn' | 'suspend' | 'ban'
  const ACCIONES_VALIDAS = ['dismiss', 'warn', 'suspend', 'ban'];
  if (!ACCIONES_VALIDAS.includes(accion)) {
    throw Object.assign(new Error('Acción inválida.'), { status: 400 });
  }

  const { data: reporte } = await supabase
    .from('reports')
    .select('id, reported_id, status')
    .eq('id', reporteId)
    .single();

  if (!reporte) throw Object.assign(new Error('Reporte no encontrado.'), { status: 404 });
  if (reporte.status !== 'pending') throw Object.assign(new Error('Reporte ya procesado.'), { status: 409 });

  // Actualizar reporte
  await supabase.from('reports').update({
    status:          accion === 'dismiss' ? 'dismissed' : 'resolved',
    resolved_by:     moderadorId,
    resolved_at:     new Date().toISOString(),
    nota_moderador,
    accion_tomada:   accion,
  }).eq('id', reporteId);

  // Aplicar consecuencias
  if (accion === 'ban') {
    await supabase.from('users').update({
      is_banned:  true,
      ban_reason: nota_moderador || 'Violación de términos de servicio',
      updated_at: new Date().toISOString(),
    }).eq('id', reporte.reported_id);
  }

  if (accion === 'suspend') {
    const suspendidoHasta = new Date(Date.now() + 7 * 86400000).toISOString(); // 7 días
    await supabase.from('users').update({
      suspended_until: suspendidoHasta,
      updated_at:      new Date().toISOString(),
    }).eq('id', reporte.reported_id);
  }

  if (accion === 'warn') {
    await supabase.from('user_warnings').insert({
      user_id:    reporte.reported_id,
      reporte_id: reporteId,
      motivo:     nota_moderador || 'Comportamiento contrario a las normas de comunidad',
    });
  }

  // Auto-ban si supera umbral de reportes confirmados
  if (accion !== 'dismiss') {
    await _verificarAutoBan(reporte.reported_id);
  }

  return { mensaje: `Reporte resuelto con acción: ${accion}` };
};

// ── Auto-ban por acumulación de reportes ─────────────────────────
const _verificarAutoBan = async (userId) => {
  const { count } = await supabase
    .from('reports')
    .select('id', { count: 'exact', head: true })
    .eq('reported_id', userId)
    .eq('status', 'resolved')
    .neq('accion_tomada', 'warn');

  if ((count || 0) >= AUTO_BAN_THRESHOLD) {
    const { data: user } = await supabase.from('users').select('is_banned').eq('id', userId).single();
    if (!user?.is_banned) {
      await supabase.from('users').update({
        is_banned:  true,
        ban_reason: 'Múltiples violaciones de las normas de comunidad (auto-moderación)',
        updated_at: new Date().toISOString(),
      }).eq('id', userId);
    }
  }
};

// ── Estadísticas de moderación ────────────────────────────────────
const getEstadisticas = async () => {
  const [{ count: pendientes }, { count: resueltos }, { count: baneados }] = await Promise.all([
    supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'resolved'),
    supabase.from('users').select('id',   { count: 'exact', head: true }).eq('is_banned', true),
  ]);

  return { reportes_pendientes: pendientes || 0, reportes_resueltos: resueltos || 0, usuarios_baneados: baneados || 0 };
};

module.exports = { getColaModeracion, resolverReporte, getEstadisticas };

// ================================================
// ÁGAPE — Servicio de Presencia (Online/Offline)
// Activo ahora / Hace horas / Inactivo
// ================================================
const supabase = require('../config/supabase');

const ACTIVO_AHORA_MS  = 5  * 60 * 1000;  // < 5 min
const ACTIVO_HOY_MS    = 24 * 60 * 60 * 1000; // < 24h

/**
 * Calcular estado de actividad a partir de last_active_at
 */
const calcularEstado = (lastActiveAt) => {
  if (!lastActiveAt) return { estado: 'inactivo', label: 'Inactivo', online: false };

  const diff = Date.now() - new Date(lastActiveAt).getTime();

  if (diff < ACTIVO_AHORA_MS) {
    return { estado: 'online', label: 'Activo ahora', online: true };
  }

  if (diff < 60 * 60 * 1000) {
    const mins = Math.floor(diff / 60000);
    return { estado: 'reciente', label: `Hace ${mins} min`, online: false };
  }

  if (diff < ACTIVO_HOY_MS) {
    const horas = Math.floor(diff / 3600000);
    return { estado: 'reciente', label: `Hace ${horas}h`, online: false };
  }

  if (diff < 7 * ACTIVO_HOY_MS) {
    const dias = Math.floor(diff / ACTIVO_HOY_MS);
    return { estado: 'inactivo', label: `Hace ${dias}d`, online: false };
  }

  return { estado: 'inactivo', label: 'Inactivo', online: false };
};

/**
 * Actualizar last_active_at del usuario (llamar en cada acción)
 */
const actualizarActividad = async (userId) => {
  await supabase
    .from('users')
    .update({ last_active_at: new Date().toISOString() })
    .eq('id', userId);
};

/**
 * Obtener presencia de múltiples usuarios de una vez
 */
const getPresenciaBulk = async (userIds) => {
  if (!userIds.length) return {};

  const { data } = await supabase
    .from('users')
    .select('id, last_active_at')
    .in('id', userIds);

  const presencia = {};
  (data || []).forEach(u => {
    presencia[u.id] = calcularEstado(u.last_active_at);
  });
  return presencia;
};

module.exports = { calcularEstado, actualizarActividad, getPresenciaBulk };

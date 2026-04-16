// ================================================
// ÁGAPE v2 — Servicio: Retos Diarios (Misiones)
// Sistema de misiones espirituales con recompensas
// ================================================

const supabase = require('../config/supabase');
const { otorgarXP, verificarBadges } = require('./spiritualJourneyService');

// ── Definición de misiones disponibles ───────────────────────────
const MISIONES = {
  // Diarias (se resetean cada día)
  leer_versiculo:     { id: 'leer_versiculo',     tipo: 'diaria', titulo: 'Palabra del día',       descripcion: 'Lee el versículo del día',          emoji: '📖', xp: 15, monedas: 5  },
  devocional_hoy:     { id: 'devocional_hoy',     tipo: 'diaria', titulo: 'Tiempo devocional',     descripcion: 'Completa el devocional de hoy',     emoji: '🙏', xp: 20, monedas: 10 },
  orar_3_peticiones:  { id: 'orar_3_peticiones',  tipo: 'diaria', titulo: 'Intercesor del día',    descripcion: 'Ora por 3 peticiones de hermanos',  emoji: '💫', xp: 25, monedas: 15 },
  compartir_bendicion:{ id: 'compartir_bendicion', tipo: 'diaria', titulo: 'Comparte la fe',       descripcion: 'Envía un mensaje de aliento',       emoji: '💌', xp: 10, monedas: 5  },
  reflexion_personal: { id: 'reflexion_personal', tipo: 'diaria', titulo: 'Reflexión personal',   descripcion: 'Escribe tu reflexión del día',      emoji: '✍️', xp: 20, monedas: 10 },

  // Semanales
  racha_5_dias:       { id: 'racha_5_dias',       tipo: 'semanal', titulo: 'Disciplina semanal',   descripcion: '5 devocionales en la semana',       emoji: '🏆', xp: 100, monedas: 50 },
  explorar_comunidad: { id: 'explorar_comunidad', tipo: 'semanal', titulo: 'Comunión',             descripcion: 'Únete a una comunidad de fe',       emoji: '🤝', xp: 50,  monedas: 30 },
  invitar_hermano:    { id: 'invitar_hermano',    tipo: 'semanal', titulo: 'Ampliar el reino',     descripcion: 'Invita a un amigo a Ágape',         emoji: '🌍', xp: 75,  monedas: 40 },

  // Especiales (únicas)
  primer_perfil:      { id: 'primer_perfil',      tipo: 'especial', titulo: 'Bienvenido a Ágape', descripcion: 'Completa tu perfil espiritual',     emoji: '⭐', xp: 50,  monedas: 30 },
  primer_conexion:    { id: 'primer_conexion',    tipo: 'especial', titulo: 'Primer lazo',        descripcion: 'Haz tu primera conexión de fe',     emoji: '💛', xp: 60,  monedas: 35 },
  curso_intro:        { id: 'curso_intro',        tipo: 'especial', titulo: 'Aprendiz de fe',     descripcion: 'Inicia tu primer curso',            emoji: '🎓', xp: 80,  monedas: 40 },
};

// ── Obtener misiones del usuario (hoy) ────────────────────────────
const obtenerMisionesDelDia = async (userId) => {
  try {
    const hoy = new Date().toISOString().split('T')[0];

    // Misiones ya completadas hoy
    const { data: completadas } = await supabase
      .from('mission_completions')
      .select('mission_id, completed_at')
      .eq('user_id', userId)
      .gte('completed_at', `${hoy}T00:00:00`)
      .lte('completed_at', `${hoy}T23:59:59`);
    const completadasIds = new Set(completadas?.map(c => c.mission_id) || []);

    // Misiones especiales ya completadas (lifetime)
    const { data: especiales } = await supabase
      .from('mission_completions')
      .select('mission_id')
      .eq('user_id', userId)
      .in('mission_id', Object.values(MISIONES).filter(m => m.tipo === 'especial').map(m => m.id));
    const especialesIds = new Set(especiales?.map(c => c.mission_id) || []);

    const misionesDiarias = Object.values(MISIONES)
      .filter(m => m.tipo === 'diaria')
      .map(m => ({ ...m, completada: completadasIds.has(m.id) }));

    const misionesSemanales = Object.values(MISIONES)
      .filter(m => m.tipo === 'semanal')
      .map(m => ({ ...m, completada: completadasIds.has(m.id) }));

    const misionesEspeciales = Object.values(MISIONES)
      .filter(m => m.tipo === 'especial')
      .map(m => ({ ...m, completada: especialesIds.has(m.id) }));

    const totalCompletadas = misionesDiarias.filter(m => m.completada).length;
    const totalDiarias = misionesDiarias.length;

    return {
      diarias: misionesDiarias,
      semanales: misionesSemanales,
      especiales: misionesEspeciales,
      progreso_diario: { completadas: totalCompletadas, total: totalDiarias },
      xp_disponible_hoy: misionesDiarias.filter(m => !m.completada).reduce((s, m) => s + m.xp, 0),
    };
  } catch (error) {
    console.error('[Misiones] Error obteniendo misiones:', error);
    throw error;
  }
};

// ── Completar una misión ──────────────────────────────────────────
const completarMision = async (userId, misionId) => {
  try {
    const mision = MISIONES[misionId];
    if (!mision) throw new Error('Misión no encontrada');

    const hoy = new Date().toISOString().split('T')[0];

    // Verificar si ya fue completada (hoy para diarias, siempre para especiales)
    const query = supabase
      .from('mission_completions')
      .select('id')
      .eq('user_id', userId)
      .eq('mission_id', misionId);

    if (mision.tipo === 'diaria') {
      query.gte('completed_at', `${hoy}T00:00:00`);
    }

    const { data: existente } = await query.single();
    if (existente) {
      return { ya_completada: true, mensaje: 'Esta misión ya fue completada.' };
    }

    // Registrar completación
    await supabase.from('mission_completions').insert({
      user_id: userId,
      mission_id: misionId,
    });

    // Dar recompensas
    const xpResult = await otorgarXP(userId, mision.xp, `Misión: ${mision.titulo}`);
    await supabase.rpc('increment_monedas_fe', { p_user_id: userId, p_cantidad: mision.monedas });

    // Verificar badges
    const badgesNuevos = await verificarBadges(userId, 'reto_completado');

    // Actualizar contador de retos en perfil espiritual
    await supabase.rpc('increment_retos_completados', { p_user_id: userId });

    const mensajes = [
      `¡Misión "${mision.titulo}" completada! ${mision.emoji}`,
      `¡Bien hecho! "+${mision.xp} XP" por "${mision.titulo}"`,
      `¡Fiel en lo pequeño! Completaste "${mision.titulo}" ${mision.emoji}`,
    ];

    return {
      ya_completada: false,
      completada: true,
      mision,
      xp_ganado: mision.xp,
      monedas_ganadas: mision.monedas,
      xp_result: xpResult,
      badges_nuevos: badgesNuevos,
      mensaje: mensajes[Math.floor(Math.random() * mensajes.length)],
    };
  } catch (error) {
    console.error('[Misiones] Error completando misión:', error);
    throw error;
  }
};

// ── Estadísticas de misiones ──────────────────────────────────────
const obtenerEstadisticasMisiones = async (userId) => {
  const { data } = await supabase
    .from('mission_completions')
    .select('mission_id, completed_at')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false });

  const total = data?.length || 0;
  const semanaAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const estaSemana = data?.filter(c => c.completed_at >= semanaAtras).length || 0;

  return { total_completadas: total, esta_semana: estaSemana };
};

module.exports = {
  MISIONES,
  obtenerMisionesDelDia,
  completarMision,
  obtenerEstadisticasMisiones,
};

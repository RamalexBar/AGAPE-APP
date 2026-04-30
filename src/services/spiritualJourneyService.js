// ================================================
// ÁGAPE v2 — Servicio: Camino Espiritual
// Sistema central de niveles, XP y progreso
// ================================================

const supabase = require('../config/supabase');

// ── Niveles Espirituales ──────────────────────────────────────────
const NIVELES = {
  1: { nombre: 'Semilla',    xp_min: 0,    xp_max: 200,  emoji: '🌱', descripcion: 'Comenzando tu camino de fe', color: '#A8D5A2' },
  2: { nombre: 'Principiante', xp_min: 200, xp_max: 500, emoji: '🌿', descripcion: 'Creciendo en la Palabra',     color: '#7BC67E' },
  3: { nombre: 'Creyente',   xp_min: 500,  xp_max: 1200, emoji: '🕊️', descripcion: 'Firmemente enraizado en fe', color: '#F4C56A' },
  4: { nombre: 'Discípulo',  xp_min: 1200, xp_max: 3000, emoji: '✝️', descripcion: 'Siguiendo el llamado',       color: '#E8956D' },
  5: { nombre: 'Siervo',     xp_min: 3000, xp_max: 6000, emoji: '🌟', descripcion: 'Sirviendo con propósito',    color: '#D4A5F5' },
  6: { nombre: 'Mentor',     xp_min: 6000, xp_max: 12000, emoji: '👑', descripcion: 'Guiando a otros en fe',     color: '#FFD700' },
  7: { nombre: 'Anciano',    xp_min: 12000, xp_max: Infinity, emoji: '🏛️', descripcion: 'Pilar de la comunidad', color: '#C0C0C0' },
};

// ── Badges Espirituales ───────────────────────────────────────────
const BADGES_ESPIRITUALES = {
  // Devocionales
  primer_devocional:    { id: 'primer_devocional',    emoji: '📖', titulo: 'Primera Devoción',    xp: 20,  descripcion: 'Leíste tu primer devocional' },
  racha_7_devocionales: { id: 'racha_7_devocionales', emoji: '🔥', titulo: '7 Días de Fuego',     xp: 100, descripcion: 'Devocional 7 días seguidos' },
  racha_30_devocionales:{ id: 'racha_30_devocionales',emoji: '💎', titulo: 'Mes de Gloria',       xp: 500, descripcion: 'Devocional 30 días seguidos' },
  // Oración
  primer_oracion:       { id: 'primer_oracion',       emoji: '🙏', titulo: 'Primera Oración',     xp: 25,  descripcion: 'Compartiste tu primera oración' },
  intercesor:           { id: 'intercesor',           emoji: '💫', titulo: 'Intercesor',           xp: 150, descripcion: 'Oraste por 50 peticiones ajenas' },
  // Comunidad
  primer_conexion:      { id: 'primer_conexion',      emoji: '🤝', titulo: 'Primera Conexión',    xp: 50,  descripcion: 'Tu primera conexión de fe' },
  embajador:            { id: 'embajador',            emoji: '🌍', titulo: 'Embajador de Fe',      xp: 300, descripcion: 'Invitaste a 5 hermanos a Ágape' },
  // Retos
  primer_reto:          { id: 'primer_reto',          emoji: '⚡', titulo: 'Primer Reto',          xp: 30,  descripcion: 'Completaste tu primer reto diario' },
  guerrero:             { id: 'guerrero',             emoji: '⚔️', titulo: 'Guerrero Espiritual',  xp: 200, descripcion: '100 retos completados' },
  // Contenido
  explorador_biblia:    { id: 'explorador_biblia',    emoji: '🗺️', titulo: 'Explorador Bíblico',  xp: 75,  descripcion: 'Leíste de 10 libros diferentes' },
  maestro:              { id: 'maestro',              emoji: '🎓', titulo: 'Maestro',              xp: 400, descripcion: 'Completaste 3 cursos' },
};

// ── Calcular nivel por XP ─────────────────────────────────────────
const calcularNivel = (xp) => {
  for (const [nivel, data] of Object.entries(NIVELES).reverse()) {
    if (xp >= data.xp_min) return { nivel: parseInt(nivel), ...data };
  }
  return { nivel: 1, ...NIVELES[1] };
};

// ── Obtener perfil espiritual completo ────────────────────────────
const obtenerPerfilEspiritual = async (userId) => {
  try {
    const { data: perfil } = await supabase
      .from('spiritual_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!perfil) {
      // Crear perfil espiritual inicial
      const nuevo = await crearPerfilEspiritual(userId);
      return nuevo;
    }

    const nivelActual = calcularNivel(perfil.total_xp);
    const siguienteNivel = NIVELES[nivelActual.nivel + 1];
    const progresoPorcentaje = siguienteNivel
      ? Math.round(((perfil.total_xp - nivelActual.xp_min) / (nivelActual.xp_max - nivelActual.xp_min)) * 100)
      : 100;

    // Badges obtenidos
    const { data: badgesObtenidos } = await supabase
      .from('user_spiritual_badges')
      .select('badge_id, obtained_at')
      .eq('user_id', userId)
      .order('obtained_at', { ascending: false });

    return {
      ...perfil,
      nivel: nivelActual,
      siguiente_nivel: siguienteNivel || null,
      progreso_porcentaje: progresoPorcentaje,
      xp_para_siguiente: siguienteNivel ? (nivelActual.xp_max - perfil.total_xp) : 0,
      badges: badgesObtenidos || [],
      badges_total: badgesObtenidos?.length || 0,
    };
  } catch (error) {
    console.error('[CaminoEspiritual] Error:', error);
    throw error;
  }
};

// ── Crear perfil espiritual ───────────────────────────────────────
const crearPerfilEspiritual = async (userId) => {
  const { data, error } = await supabase
    .from('spiritual_profiles')
    .insert({
      user_id: userId,
      total_xp: 0,
      nivel: 1,
      racha_devocional: 0,
      max_racha_devocional: 0,
      total_devocionales: 0,
      total_retos_completados: 0,
      total_oraciones_compartidas: 0,
      total_oraciones_intercedidas: 0,
      monedas_fe: 100, // monedas de bienvenida
      ultimo_devocional: null,
    })
    .select()
    .single();

  if (error) throw error;
  return { ...data, nivel: NIVELES[1], progreso_porcentaje: 0, badges: [] };
};

// ── Otorgar XP ────────────────────────────────────────────────────
const otorgarXP = async (userId, cantidad, motivo) => {
  try {
    // Obtener XP actual
    const { data: perfil } = await supabase
      .from('spiritual_profiles')
      .select('total_xp, nivel')
      .eq('user_id', userId)
      .single();

    if (!perfil) return null;

    const xpAnterior = perfil.total_xp;
    const xpNuevo = xpAnterior + cantidad;
    const nivelAnterior = calcularNivel(xpAnterior);
    const nivelNuevo = calcularNivel(xpNuevo);
    const subiNivel = nivelNuevo.nivel > nivelAnterior.nivel;

    // Actualizar XP
    await supabase
      .from('spiritual_profiles')
      .update({ total_xp: xpNuevo, nivel: nivelNuevo.nivel })
      .eq('user_id', userId);

    // Registrar en historial de XP
    await supabase.from('xp_history').insert({
      user_id: userId,
      xp_ganado: cantidad,
      motivo,
      total_xp_despues: xpNuevo,
    });

    console.log(`[XP] Usuario ${userId}: +${cantidad} XP por "${motivo}" → Total: ${xpNuevo}`);

    return {
      xp_ganado: cantidad,
      total_xp: xpNuevo,
      nivel: nivelNuevo,
      subio_nivel: subiNivel,
      nivel_anterior: subiNivel ? nivelAnterior : null,
    };
  } catch (error) {
    console.error('[CaminoEspiritual] Error otorgando XP:', error);
    return null;
  }
};

// ── Verificar y otorgar badges ────────────────────────────────────
const verificarBadges = async (userId, evento, datos = {}) => {
  const badgesNuevos = [];

  const { data: yaObtenidos } = await supabase
    .from('user_spiritual_badges')
    .select('badge_id')
    .eq('user_id', userId);
  const idsObtenidos = new Set(yaObtenidos?.map(b => b.badge_id) || []);

  const otorgar = async (badgeId) => {
    if (idsObtenidos.has(badgeId)) return;
    const badge = BADGES_ESPIRITUALES[badgeId];
    if (!badge) return;

    await supabase.from('user_spiritual_badges').insert({
      user_id: userId,
      badge_id: badgeId,
    });

    const xpResult = await otorgarXP(userId, badge.xp, `Badge: ${badge.titulo}`);
    badgesNuevos.push({ ...badge, xp_result: xpResult });
    idsObtenidos.add(badgeId);
  };

  const { data: sp } = await supabase
    .from('spiritual_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  switch (evento) {
    case 'devocional_completado':
      if ((sp?.total_devocionales || 0) === 1) await otorgar('primer_devocional');
      if ((sp?.racha_devocional || 0) >= 7)  await otorgar('racha_7_devocionales');
      if ((sp?.racha_devocional || 0) >= 30) await otorgar('racha_30_devocionales');
      break;
    case 'oracion_compartida':
      if ((sp?.total_oraciones_compartidas || 0) === 1) await otorgar('primer_oracion');
      break;
    case 'oracion_intercedida':
      if ((sp?.total_oraciones_intercedidas || 0) >= 50) await otorgar('intercesor');
      break;
    case 'reto_completado':
      if ((sp?.total_retos_completados || 0) === 1) await otorgar('primer_reto');
      if ((sp?.total_retos_completados || 0) >= 100) await otorgar('guerrero');
      break;
    case 'nueva_conexion':
      if (!idsObtenidos.has('primer_conexion')) await otorgar('primer_conexion');
      break;
    case 'curso_completado':
      if ((datos?.cursos_completados || 0) >= 3) await otorgar('maestro');
      break;
  }

  return badgesNuevos;
};

// ── Actualizar racha devocional ───────────────────────────────────
const actualizarRachaDevocional = async (userId) => {
  const { data: sp } = await supabase
    .from('spiritual_profiles')
    .select('racha_devocional, max_racha_devocional, ultimo_devocional, total_devocionales')
    .eq('user_id', userId)
    .single();

  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const ayer = new Date(hoy); ayer.setDate(ayer.getDate() - 1);
  const ultimo = sp?.ultimo_devocional ? new Date(sp.ultimo_devocional) : null;

  let nuevaRacha = 1;
  if (ultimo) {
    ultimo.setHours(0, 0, 0, 0);
    if (ultimo.getTime() === hoy.getTime()) return { racha: sp.racha_devocional, ya_hecho: true };
    if (ultimo.getTime() === ayer.getTime()) nuevaRacha = (sp.racha_devocional || 1) + 1;
  }

  const maxRacha = Math.max(nuevaRacha, sp?.max_racha_devocional || 0);
  const totalDevocionales = (sp?.total_devocionales || 0) + 1;

  await supabase
    .from('spiritual_profiles')
    .update({
      racha_devocional: nuevaRacha,
      max_racha_devocional: maxRacha,
      ultimo_devocional: hoy.toISOString(),
      total_devocionales: totalDevocionales,
    })
    .eq('user_id', userId);

  // XP por devocional
  let xpBonus = 20; // base
  if (nuevaRacha >= 7) xpBonus = 40;
  if (nuevaRacha >= 30) xpBonus = 80;
  const xpResult = await otorgarXP(userId, xpBonus, `Devocional día ${nuevaRacha}`);

  // Monedas de fe
  const monedasBonus = nuevaRacha >= 7 ? 15 : 5;
  await supabase.rpc('increment_monedas_fe', { p_user_id: userId, p_cantidad: monedasBonus });

  return {
    racha: nuevaRacha,
    max_racha: maxRacha,
    xp_result: xpResult,
    monedas_ganadas: monedasBonus,
    ya_hecho: false,
  };
};

// ── Ranking de crecimiento espiritual ─────────────────────────────
const obtenerRankingCrecimiento = async (limite = 20) => {
  const { data } = await supabase
    .from('spiritual_profiles')
    .select(`
      total_xp, nivel, racha_devocional, total_retos_completados,
      user:user_id(id, nombre, avatar_url, is_verified)
    `)
    .order('total_xp', { ascending: false })
    .limit(limite);

  return (data || []).map((sp, idx) => ({
    posicion: idx + 1,
    ...sp,
    nivel_info: calcularNivel(sp.total_xp),
  }));
};

module.exports = {
  NIVELES,
  BADGES_ESPIRITUALES,
  calcularNivel,
  obtenerPerfilEspiritual,
  crearPerfilEspiritual,
  otorgarXP,
  verificarBadges,
  actualizarRachaDevocional,
  obtenerRankingCrecimiento,
};

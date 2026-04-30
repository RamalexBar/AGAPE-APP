// ================================================
// ÁGAPE — Servicio de Swipes con Límites v3
// Gratis: 20 base + 6/anuncio (máx 2) + bonus referido
// Premium: ilimitado
// ================================================
const supabase = require('../config/supabase');
const { obtenerSuscripcion } = require('./monetizationAgapeService');

const SWIPES_BASE_GRATIS  = 20;
const SWIPES_POR_ANUNCIO  = 6;
const MAX_ANUNCIOS_DIA    = 2;
const SWIPES_MAX_GRATIS   = SWIPES_BASE_GRATIS + SWIPES_POR_ANUNCIO * MAX_ANUNCIOS_DIA; // 32

const _getContadorHoy = async (userId) => {
  const hoy = new Date().toISOString().split('T')[0];
  const { data: fila } = await supabase
    .from('user_swipe_counters').select('*')
    .eq('user_id', userId).eq('swipe_date', hoy).single();
  if (fila) return fila;

  const { data: nueva, error } = await supabase
    .from('user_swipe_counters')
    .insert({ user_id: userId, swipe_date: hoy, daily_swipe_count: 0, ad_bonus_used: 0, referral_bonus: 0 })
    .select().single();
  if (error) throw Object.assign(new Error('Error al inicializar contador.'), { status: 500 });
  return nueva;
};

const getSwipeStatus = async (userId) => {
  const suscripcion = await obtenerSuscripcion(userId);
  const esPremium   = suscripcion.plan.id !== 'free';

  if (esPremium) {
    return { es_premium: true, permitido: true, swipes_restantes: Infinity, swipes_base: Infinity, anuncios_usados: null, anuncios_restantes: null };
  }

  const contador       = await _getContadorHoy(userId);
  const swipesUsados   = contador.daily_swipe_count;
  const anunciosUsados = contador.ad_bonus_used;
  const bonusReferido  = contador.referral_bonus || 0;
  const bonusAnuncios  = anunciosUsados * SWIPES_POR_ANUNCIO;
  const limiteTotal    = SWIPES_BASE_GRATIS + bonusAnuncios + bonusReferido;
  const restantes      = Math.max(0, limiteTotal - swipesUsados);

  return {
    es_premium:          false,
    permitido:           swipesUsados < limiteTotal,
    swipes_usados:       swipesUsados,
    swipes_restantes:    restantes,
    swipes_base:         SWIPES_BASE_GRATIS,
    swipes_bonus_anuncios: bonusAnuncios,
    swipes_bonus_referido: bonusReferido,
    limite_total_hoy:    limiteTotal,
    anuncios_usados:     anunciosUsados,
    anuncios_restantes:  Math.max(0, MAX_ANUNCIOS_DIA - anunciosUsados),
    puede_ver_anuncio:   anunciosUsados < MAX_ANUNCIOS_DIA,
  };
};

const verificarSwipe = async (userId) => {
  const status = await getSwipeStatus(userId);
  if (status.es_premium) return { permitido: true, es_premium: true };
  if (status.permitido)  return { permitido: true, es_premium: false, swipes_restantes: status.swipes_restantes, limite_total_hoy: status.limite_total_hoy };
  if (status.puede_ver_anuncio) {
    return { permitido: false, showAdsOption: true, anuncios_restantes: status.anuncios_restantes, message: `Has alcanzado tu límite. Mira un anuncio y obtén ${SWIPES_POR_ANUNCIO} swipes más 📺` };
  }
  return { permitido: false, showPlans: true, message: 'Límite alcanzado. Hazte premium para seguir conectando 💛' };
};

const incrementarSwipe = async (userId) => {
  const { error } = await supabase.rpc('increment_daily_swipe', { p_user_id: userId });
  if (error) {
    const hoy = new Date().toISOString().split('T')[0];
    const contador = await _getContadorHoy(userId);
    await supabase.from('user_swipe_counters')
      .update({ daily_swipe_count: contador.daily_swipe_count + 1 })
      .eq('user_id', userId).eq('swipe_date', hoy);
  }
};

const registrarAnuncio = async (userId) => {
  const hoy     = new Date().toISOString().split('T')[0];
  const contador = await _getContadorHoy(userId);

  if (contador.ad_bonus_used >= MAX_ANUNCIOS_DIA) {
    throw Object.assign(new Error('Ya usaste el máximo de anuncios por hoy.'), { status: 429 });
  }

  const { data } = await supabase
    .from('user_swipe_counters')
    .update({ ad_bonus_used: contador.ad_bonus_used + 1 })
    .eq('user_id', userId).eq('swipe_date', hoy).select().single();

  const nuevoAnuncios  = data.ad_bonus_used;
  const bonusReferido  = data.referral_bonus || 0;
  const limiteNuevo    = SWIPES_BASE_GRATIS + nuevoAnuncios * SWIPES_POR_ANUNCIO + bonusReferido;
  const restantes      = Math.max(0, limiteNuevo - data.daily_swipe_count);

  return {
    success: true, extra_swipes: SWIPES_POR_ANUNCIO, swipes_restantes: restantes,
    anuncios_usados: nuevoAnuncios, anuncios_restantes: Math.max(0, MAX_ANUNCIOS_DIA - nuevoAnuncios),
    puede_ver_mas_anuncios: nuevoAnuncios < MAX_ANUNCIOS_DIA,
    message: `¡+${SWIPES_POR_ANUNCIO} swipes desbloqueados! Tienes ${restantes} disponibles 🎉`,
  };
};

module.exports = { SWIPES_BASE_GRATIS, SWIPES_POR_ANUNCIO, MAX_ANUNCIOS_DIA, SWIPES_MAX_GRATIS, getSwipeStatus, verificarSwipe, incrementarSwipe, registrarAnuncio };

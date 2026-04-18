// ================================================
// ÁGAPE — Monetización v4  (App Store Ready)
// FREE / PREMIUM / VIP + Monedas de Fe + Boost
// ================================================
const supabase = require('../config/supabase');

// ── Planes (IDs deben coincidir con App Store Connect / Play Console) ──
const PLANES = {
  free: {
    id: 'free',
    nombre: 'Semilla',
    emoji: '🌱',
    color: '#7BC67E',
    descripcion: 'Comienza tu camino de fe',
    precio_mensual_cop: 0,
    precio_anual_cop:   0,
    // IDs en tiendas
    apple_product_id:  null,
    google_product_id: null,
    beneficios: [
      '20 conexiones por día',
      'Devocional diario',
      'Ver perfiles básicos',
      'Chat con matches',
      'Comunidades públicas',
    ],
    limites: {
      conexiones_diarias:   20,
      mensajes_diarios:     50,
      ver_quien_dio_like:   false,
      filtros_avanzados:    false,
      rewind:               false,
      super_conexiones_dia: 0,
      boost:                false,
      ver_compatibilidad:   false,
      sin_anuncios:         false,
      mentoria:             false,
    },
  },

  premium: {
    id: 'premium',
    nombre: 'Creyente',
    emoji: '✝️',
    color: '#E8956D',
    descripcion: 'Conecta sin límites con propósito',
    precio_mensual_cop: 14900,
    precio_anual_cop:   119900,  // ~67% del mensual × 12
    apple_product_id:   'com.agape.app.premium.monthly',
    google_product_id:  'agape_premium_monthly',
    apple_annual_id:    'com.agape.app.premium.yearly',
    google_annual_id:   'agape_premium_yearly',
    beneficios: [
      'Conexiones ilimitadas',
      'Ver quién te dio like',
      'Filtros espirituales avanzados',
      '5 super-conexiones por día',
      'Rewind (deshacer último pass)',
      'Sin anuncios',
      'Ver % de compatibilidad',
      'Badge verificado en perfil',
    ],
    limites: {
      conexiones_diarias:   Infinity,
      mensajes_diarios:     Infinity,
      ver_quien_dio_like:   true,
      filtros_avanzados:    true,
      rewind:               true,
      super_conexiones_dia: 5,
      boost:                false,
      ver_compatibilidad:   true,
      sin_anuncios:         true,
      mentoria:             false,
    },
  },

  vip: {
    id: 'vip',
    nombre: 'Mentor',
    emoji: '👑',
    color: '#FFD700',
    descripcion: 'La experiencia cristiana completa',
    precio_mensual_cop: 34900,
    precio_anual_cop:   269900,
    apple_product_id:   'com.agape.app.vip.monthly',
    google_product_id:  'agape_vip_monthly',
    apple_annual_id:    'com.agape.app.vip.yearly',
    google_annual_id:   'agape_vip_yearly',
    beneficios: [
      'Todo lo de Premium',
      'Boost de perfil semanal',
      'Super-conexiones ilimitadas',
      'Mentoría cristiana 1-a-1',
      'Acceso a cursos espirituales',
      'Eventos VIP exclusivos',
      'Badge dorado en perfil',
      'Soporte prioritario',
    ],
    limites: {
      conexiones_diarias:   Infinity,
      mensajes_diarios:     Infinity,
      ver_quien_dio_like:   true,
      filtros_avanzados:    true,
      rewind:               true,
      super_conexiones_dia: Infinity,
      boost:                true,      // boost semanal automático
      ver_compatibilidad:   true,
      sin_anuncios:         true,
      mentoria:             true,
    },
  },
};

// ── Monedas de Fe (virtual currency — no cash value) ─────────────
// Product IDs para compra directa de monedas via IAP
const PAQUETES_MONEDAS = [
  { id: 'coins_100',  apple_id: 'com.agape.coins.100',  google_id: 'agape_coins_100',  cantidad: 100,  bonus: 0,   precio_cop: 4900,  label: '100 monedas' },
  { id: 'coins_300',  apple_id: 'com.agape.coins.300',  google_id: 'agape_coins_300',  cantidad: 300,  bonus: 30,  precio_cop: 12900, label: '300 + 30 monedas' },
  { id: 'coins_700',  apple_id: 'com.agape.coins.700',  google_id: 'agape_coins_700',  cantidad: 700,  bonus: 100, precio_cop: 24900, label: '700 + 100 monedas' },
  { id: 'coins_1500', apple_id: 'com.agape.coins.1500', google_id: 'agape_coins_1500', cantidad: 1500, bonus: 300, precio_cop: 44900, label: '1500 + 300 monedas' },
];

// ── Tienda de Monedas de Fe ────────────────────────────────────────
const TIENDA_MONEDAS = {
  super_conexion: { id: 'super_conexion', monedas: 30,  label: 'Super-Conexión',     emoji: '⚡', descripcion: 'Notifica al otro que te interesas' },
  rewind:         { id: 'rewind',         monedas: 20,  label: 'Rewind',             emoji: '↩️', descripcion: 'Deshacer el último pass' },
  boost_1h:       { id: 'boost_1h',       monedas: 100, label: 'Boost 1 hora',       emoji: '🚀', descripcion: 'Aparece primero en el feed por 1h' },
  ver_like:       { id: 'ver_like',        monedas: 15,  label: 'Ver un Like',        emoji: '💛', descripcion: 'Revelar quién te dio like (1 perfil)' },
};

// ── Obtener suscripción activa del usuario ────────────────────────
const obtenerSuscripcion = async (userId) => {
  try {
    // Verificar si suscripción expiró
    await _expirarSuscripcionesVencidas(userId);

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('id, plan_type, started_at, expires_at, plataforma, is_active')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const planId = sub?.plan_type || 'free';
    const plan   = PLANES[planId] || PLANES.free;

    const { data: sp } = await supabase
      .from('spiritual_profiles')
      .select('monedas_fe')
      .eq('user_id', userId)
      .single();

    const ahora      = new Date();
    const vence      = sub?.expires_at ? new Date(sub.expires_at) : null;
    const diasRestantes = vence ? Math.max(0, Math.ceil((vence - ahora) / 86400000)) : null;

    return {
      plan,
      plan_id:         planId,
      es_premium:      planId !== 'free',
      es_vip:          planId === 'vip',
      suscripcion:     sub || null,
      vence_en:        sub?.expires_at || null,
      dias_restantes:  diasRestantes,
      monedas_fe:      sp?.monedas_fe || 0,
      plataforma:      sub?.plataforma || null,
    };
  } catch {
    return { plan: PLANES.free, plan_id: 'free', es_premium: false, es_vip: false, monedas_fe: 0 };
  }
};

// ── Expirar suscripciones vencidas automáticamente ───────────────
const _expirarSuscripcionesVencidas = async (userId) => {
  await supabase
    .from('subscriptions')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('is_active', true)
    .lt('expires_at', new Date().toISOString());
};

// ── Verificar límite de una acción ───────────────────────────────
const verificarLimite = async (userId, accion) => {
  const { plan } = await obtenerSuscripcion(userId);
  const limites  = plan.limites;
  const hoy      = new Date().toISOString().split('T')[0];

  switch (accion) {
    case 'conexion': {
      if (limites.conexiones_diarias === Infinity) return { permitido: true };
      const { count } = await supabase
        .from('swipes').select('id', { count: 'exact', head: true })
        .eq('from_user_id', userId).gte('created_at', `${hoy}T00:00:00`);
      const restantes = Math.max(0, limites.conexiones_diarias - (count || 0));
      return {
        permitido:        (count || 0) < limites.conexiones_diarias,
        restantes,
        limite:           limites.conexiones_diarias,
        upgrade_mensaje:  restantes === 0 ? 'Actualiza a Premium para conexiones ilimitadas 🌟' : null,
      };
    }
    case 'mensaje': {
      if (limites.mensajes_diarios === Infinity) return { permitido: true };
      const { count } = await supabase
        .from('messages').select('id', { count: 'exact', head: true })
        .eq('sender_id', userId).gte('created_at', `${hoy}T00:00:00`);
      return { permitido: (count || 0) < limites.mensajes_diarios, restantes: Math.max(0, limites.mensajes_diarios - (count || 0)) };
    }
    case 'rewind':          return { permitido: limites.rewind,             upgrade_mensaje: !limites.rewind ? 'Rewind disponible en Premium ↩️' : null };
    case 'ver_likes':       return { permitido: limites.ver_quien_dio_like, upgrade_mensaje: !limites.ver_quien_dio_like ? 'Ver quién te dio like — disponible en Premium 💛' : null };
    case 'filtros':         return { permitido: limites.filtros_avanzados };
    case 'compatibilidad':  return { permitido: limites.ver_compatibilidad };
    case 'mentoria':        return { permitido: limites.mentoria,           upgrade_mensaje: !limites.mentoria ? 'Mentoría disponible en VIP 👑' : null };
    case 'boost':           return { permitido: limites.boost };
    default:                return { permitido: true };
  }
};

// ── Activar suscripción ───────────────────────────────────────────
const activarSuscripcion = async (userId, planId, { dias = 30, transactionId = null, plataforma = null } = {}) => {
  const plan = PLANES[planId];
  if (!plan || planId === 'free') throw Object.assign(new Error('Plan inválido.'), { status: 400 });

  const ahora      = new Date();
  const vencimiento = new Date(ahora.getTime() + dias * 86400000);

  // Desactivar suscripciones previas
  await supabase.from('subscriptions').update({ is_active: false }).eq('user_id', userId).eq('is_active', true);

  // Insertar nueva
  const { data: nueva } = await supabase.from('subscriptions').insert({
    user_id:        userId,
    plan_type:      planId,
    is_active:      true,
    started_at:     ahora.toISOString(),
    expires_at:     vencimiento.toISOString(),
    transaction_id: transactionId,
    plataforma,
    precio_pagado:  dias >= 365 ? plan.precio_anual_cop : plan.precio_mensual_cop,
  }).select().single();

  // Bonus de monedas de bienvenida
  const bonusMonedas = planId === 'vip' ? 500 : 200;
  await supabase.rpc('increment_monedas_fe', { p_user_id: userId, p_cantidad: bonusMonedas });

  // Registrar evento de conversión
  await supabase.from('monetization_events').insert({
    user_id:     userId,
    evento:      'subscription_activated',
    plan_id:     planId,
    valor_cop:   nueva.precio_pagado,
    metadata:    JSON.stringify({ transaction_id: transactionId, plataforma, dias }),
  }).catch(() => {});

  return { ok: true, suscripcion: nueva, bonus_monedas: bonusMonedas, vence_en: vencimiento.toISOString() };
};

// ── Comprar con Monedas de Fe ─────────────────────────────────────
const comprarConMonedas = async (userId, itemId) => {
  const item = TIENDA_MONEDAS[itemId];
  if (!item) throw Object.assign(new Error('Item no encontrado.'), { status: 404 });

  const { data: sp } = await supabase.from('spiritual_profiles').select('monedas_fe').eq('user_id', userId).single();
  const saldo = sp?.monedas_fe || 0;

  if (saldo < item.monedas) throw Object.assign(new Error(`Monedas insuficientes. Necesitas ${item.monedas} monedas.`), { status: 402 });

  await supabase.rpc('decrement_monedas_fe', { p_user_id: userId, p_cantidad: item.monedas });
  await supabase.from('monedas_purchases').insert({ user_id: userId, item_id: itemId, monedas_gastadas: item.monedas });

  return { ok: true, item, monedas_gastadas: item.monedas, monedas_restantes: saldo - item.monedas };
};

// ── Revenue stats (para admin/analytics) ─────────────────────────
const getRevenueStats = async () => {
  const hoy   = new Date().toISOString().split('T')[0];
  const mes   = hoy.slice(0, 7);

  const [activas, hoy_events, mes_events] = await Promise.all([
    supabase.from('subscriptions').select('plan_type', { count: 'exact' }).eq('is_active', true),
    supabase.from('monetization_events').select('valor_cop').eq('evento', 'subscription_activated').gte('created_at', `${hoy}T00:00:00`),
    supabase.from('monetization_events').select('valor_cop').eq('evento', 'subscription_activated').gte('created_at', `${mes}-01T00:00:00`),
  ]);

  const sumarValores = (rows) => (rows?.data || []).reduce((s, r) => s + (r.valor_cop || 0), 0);

  return {
    suscripciones_activas: activas.count || 0,
    revenue_hoy_cop:       sumarValores(hoy_events),
    revenue_mes_cop:       sumarValores(mes_events),
  };
};

module.exports = { PLANES, PAQUETES_MONEDAS, TIENDA_MONEDAS, obtenerSuscripcion, verificarLimite, activarSuscripcion, comprarConMonedas, getRevenueStats };

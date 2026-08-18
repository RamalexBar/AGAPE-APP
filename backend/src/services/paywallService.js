// ================================================
// ÁGAPE — Servicio de Paywall Inteligente
// Triggers emocionales → conversión Premium
// ================================================
const supabase     = require('../config/supabase');
const { obtenerSuscripcion } = require('./monetizationAgapeService');

// ── Mensajes emocionales por trigger ─────────────────────────────
const MENSAJES = {
  like_recibido: {
    titulo:    'Alguien especial quiere conocerte ❤️',
    subtitulo: 'Hay una persona que ya dio like a tu perfil. Descubre quién es.',
    cta:       'Ver quién es',
    icono:     'heart',
    urgencia:  'alta',
  },
  sin_swipes: {
    titulo:    'Hay más personas esperando conocerte',
    subtitulo: 'Mira un anuncio breve y sigue descubriendo conexiones especiales.',
    cta_ads:   'Ver anuncio y continuar',
    cta_premium: 'Swipes ilimitados con Premium',
    icono:     'search',
    urgencia:  'media',
  },
  sin_swipes_ads_agotados: {
    titulo:    'No te pierdas conexiones importantes',
    subtitulo: 'Tu próximo match podría estar esperándote ahora mismo.',
    cta:       'Conocer sin límites',
    icono:     'infinite',
    urgencia:  'alta',
  },
  alta_compatibilidad: {
    titulo:    'Comparten algo especial ✨',
    subtitulo: 'Esta persona tiene {compat}% de afinidad espiritual contigo. Descúbrela con Premium.',
    cta:       'Ver compatibilidad completa',
    icono:     'sparkles',
    urgencia:  'alta',
  },
  perfil_incompleto: {
    titulo:    'Tu perfil merece brillar',
    subtitulo: 'Los perfiles completos reciben 3x más conexiones. Completa el tuyo.',
    cta:       'Completar perfil',
    icono:     'person',
    urgencia:  'baja',
  },
  inactividad_3dias: {
    titulo:    'No estás aquí por casualidad',
    subtitulo: '${nombre}, hay personas nuevas esperando conocerte.',
    cta:       'Volver a explorar',
    icono:     'refresh',
    urgencia:  'media',
  },
};

/**
 * Determinar si debe mostrarse el paywall y qué tipo
 * @returns { mostrar, tipo, mensaje, datos_extra }
 */
const evaluarPaywall = async (userId, contexto = {}) => {
  const { trigger, compat_score, perfil_match } = contexto;

  const suscripcion = await obtenerSuscripcion(userId);
  if (suscripcion.es_premium) return { mostrar: false }; // Premium nunca ve paywall

  // ── Trigger: recibió like ───────────────────────────────────────
  if (trigger === 'like_recibido') {
    return {
      mostrar:   true,
      tipo:      'like_recibido',
      mensaje:   MENSAJES.like_recibido,
      prioridad: 'CRITICA',
    };
  }

  // ── Trigger: sin swipes disponibles ────────────────────────────
  if (trigger === 'sin_swipes') {
    // Verificar si tiene anuncios disponibles
    const { data: contador } = await supabase
      .from('user_swipe_counters')
      .select('ad_bonus_used')
      .eq('user_id', userId)
      .eq('swipe_date', new Date().toISOString().split('T')[0])
      .single();

    const adsUsados = contador?.ad_bonus_used || 0;
    const puedeVerAd = adsUsados < 2;

    if (puedeVerAd) {
      return {
        mostrar:         true,
        tipo:            'sin_swipes',
        mensaje:         MENSAJES.sin_swipes,
        puede_ver_ad:    true,
        ads_restantes:   2 - adsUsados,
        prioridad:       'ALTA',
      };
    }
    return {
      mostrar:      true,
      tipo:         'sin_swipes_ads_agotados',
      mensaje:      MENSAJES.sin_swipes_ads_agotados,
      puede_ver_ad: false,
      prioridad:    'CRITICA',
    };
  }

  // ── Trigger: alta compatibilidad (≥85%) ─────────────────────────
  if (trigger === 'alta_compatibilidad' && compat_score >= 85) {
    const msg = { ...MENSAJES.alta_compatibilidad };
    msg.subtitulo = msg.subtitulo.replace('{compat}', compat_score);
    return {
      mostrar:    true,
      tipo:       'alta_compatibilidad',
      mensaje:    msg,
      compat:     compat_score,
      perfil:     perfil_match ? { nombre: perfil_match.nombre, avatar_url: perfil_match.avatar_url } : null,
      prioridad:  'ALTA',
    };
  }

  return { mostrar: false };
};

/**
 * Registrar que el usuario vio el paywall (para A/B testing y analytics)
 */
const registrarVistaPaywall = async (userId, tipo) => {
  await supabase.from('paywall_events').insert({
    user_id: userId,
    tipo,
    visto_at: new Date().toISOString(),
  }).catch(() => {});
};

module.exports = { evaluarPaywall, registrarVistaPaywall, MENSAJES };

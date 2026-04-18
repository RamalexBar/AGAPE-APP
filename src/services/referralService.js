// ================================================
// ÁGAPE — Sistema de Referidos
// Código de invitación + recompensas
// ================================================
const supabase = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');

const SWIPES_BONUS_REFERIDO   = 20;  // swipes extra al referido
const DIAS_PREMIUM_REFERIDOR  = 3;   // días premium gratis al que refirió

/**
 * Generar o recuperar código de referido de un usuario
 */
const obtenerCodigoReferido = async (userId) => {
  const { data: existing } = await supabase
    .from('referral_codes')
    .select('codigo, usos, created_at')
    .eq('user_id', userId)
    .single();

  if (existing) return existing;

  // Generar código único de 8 chars
  const codigo = uuidv4().replace(/-/g, '').slice(0, 8).toUpperCase();

  const { data, error } = await supabase
    .from('referral_codes')
    .insert({ user_id: userId, codigo, usos: 0 })
    .select()
    .single();

  if (error) throw Object.assign(new Error('Error al generar código.'), { status: 500 });
  return data;
};

/**
 * Aplicar código de referido al registrarse
 * Lllamar desde authService.register() con el codigo opcional
 */
const aplicarCodigo = async (nuevoUserId, codigo) => {
  if (!codigo) return null;

  const codigoUpper = codigo.toUpperCase().trim();

  // Buscar código válido
  const { data: ref } = await supabase
    .from('referral_codes')
    .select('id, user_id, usos')
    .eq('codigo', codigoUpper)
    .single();

  if (!ref) return { valido: false, mensaje: 'Código de invitación no válido.' };
  if (ref.user_id === nuevoUserId) return { valido: false, mensaje: 'No puedes usar tu propio código.' };

  // Verificar que no haya sido aplicado ya por este usuario
  const { data: yaUsado } = await supabase
    .from('referral_uses')
    .select('id')
    .eq('referral_code_id', ref.id)
    .eq('referred_user_id', nuevoUserId)
    .single();

  if (yaUsado) return { valido: false, mensaje: 'Ya usaste este código.' };

  // Registrar uso
  await supabase.from('referral_uses').insert({
    referral_code_id: ref.id,
    referrer_id:      ref.user_id,
    referred_user_id: nuevoUserId,
  });

  // Incrementar contador de usos
  await supabase
    .from('referral_codes')
    .update({ usos: ref.usos + 1 })
    .eq('id', ref.id);

  // ── Recompensa al NUEVO usuario: +20 swipes extra el primer día ──
  const hoy = new Date().toISOString().split('T')[0];
  await supabase.from('user_swipe_counters').upsert({
    user_id:           nuevoUserId,
    swipe_date:        hoy,
    daily_swipe_count: 0,
    ad_bonus_used:     0,
    referral_bonus:    SWIPES_BONUS_REFERIDO,
  }, { onConflict: 'user_id,swipe_date' });

  // ── Recompensa al REFERIDOR: 3 días premium gratis ──────────────
  await _otorgarPremiumTemporal(ref.user_id, DIAS_PREMIUM_REFERIDOR);

  return {
    valido:            true,
    referidor_id:      ref.user_id,
    swipes_extra:      SWIPES_BONUS_REFERIDO,
    mensaje:           `¡Código válido! Tienes ${SWIPES_BONUS_REFERIDO} swipes extra hoy 🎉`,
  };
};

/**
 * Otorgar días de premium temporal al referidor
 */
const _otorgarPremiumTemporal = async (userId, dias) => {
  const { data: subActual } = await supabase
    .from('subscriptions')
    .select('id, expires_at, plan_type, is_active')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('expires_at', { ascending: false })
    .limit(1)
    .single();

  // Si ya es premium, extender vencimiento
  if (subActual?.plan_type !== 'free' && subActual?.expires_at) {
    const nuevaExpiracion = new Date(subActual.expires_at);
    nuevaExpiracion.setDate(nuevaExpiracion.getDate() + dias);
    await supabase
      .from('subscriptions')
      .update({ expires_at: nuevaExpiracion.toISOString() })
      .eq('id', subActual.id);
    return;
  }

  // Si es free, crear suscripción temporal
  const expires = new Date();
  expires.setDate(expires.getDate() + dias);

  await supabase.from('subscriptions').insert({
    user_id:        userId,
    plan_type:      'premium',
    is_active:      true,
    started_at:     new Date().toISOString(),
    expires_at:     expires.toISOString(),
    transaction_id: `referral_bonus_${Date.now()}`,
    precio_pagado:  0,
  });
};

/**
 * Historial de referidos de un usuario
 */
const getHistorialReferidos = async (userId) => {
  const { data: codigo } = await supabase
    .from('referral_codes')
    .select('codigo, usos')
    .eq('user_id', userId)
    .single();

  if (!codigo) return { codigo: null, referidos: [], total: 0 };

  const { data: usos } = await supabase
    .from('referral_uses')
    .select(`
      created_at,
      referred:referred_user_id(nombre, avatar_url, created_at)
    `)
    .eq('referrer_id', userId)
    .order('created_at', { ascending: false });

  return {
    codigo:   codigo.codigo,
    total:    codigo.usos,
    referidos: (usos || []).map(u => ({
      nombre:     u.referred?.nombre,
      avatar_url: u.referred?.avatar_url,
      fecha:      u.created_at,
    })),
  };
};

module.exports = {
  obtenerCodigoReferido,
  aplicarCodigo,
  getHistorialReferidos,
  SWIPES_BONUS_REFERIDO,
  DIAS_PREMIUM_REFERIDOR,
};

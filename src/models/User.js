// ================================================
// ÁGAPE — Modelo: User
// Descripción de campos + helpers de consulta
// (No es ORM — es documentación + funciones de acceso)
// ================================================
const supabase = require('../config/supabase');

/**
 * Campos de la tabla `users` relevantes para swipes y monetización:
 *
 * id                UUID        PK
 * nombre            VARCHAR(60)
 * email             VARCHAR(255)
 * genero            VARCHAR(10)  M | F | otro
 * fecha_nacimiento  DATE
 * avatar_url        TEXT
 * bio               VARCHAR(500)
 * denomination      VARCHAR(80)
 * connection_purpose VARCHAR(20) friendship | community | marriage
 * nivel             INT          (desnormalizado de spiritual_profiles)
 * is_active         BOOLEAN
 * is_verified       BOOLEAN
 * is_banned         BOOLEAN
 * last_active_at    TIMESTAMPTZ
 * created_at        TIMESTAMPTZ
 * updated_at        TIMESTAMPTZ
 *
 * Campos de límites de swipes (tabla `user_swipe_counters`):
 *
 * daily_swipe_count  INT   → cuántos likes dio hoy
 * last_swipe_date    DATE  → fecha del último swipe (= swipe_date en la tabla)
 * ad_bonus_used      INT   → anuncios vistos hoy (máx 2)
 *
 * Reglas:
 *   - GRATIS:  límite = 20 + (ad_bonus_used * 6)  → máx 32/día
 *   - PREMIUM: sin límite
 */

// ── Buscar usuario por ID ─────────────────────────────────────────
const findById = async (id) => {
  const { data, error } = await supabase
    .from('users')
    .select(`
      id, nombre, email, genero, fecha_nacimiento, edad,
      avatar_url, bio, ubicacion_ciudad,
      denomination, connection_purpose, valores,
      nivel, is_active, is_verified, is_faith_verified, is_banned,
      role, last_active_at, created_at
    `)
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return data;
};

// ── Buscar usuario por email ──────────────────────────────────────
const findByEmail = async (email) => {
  const { data } = await supabase
    .from('users')
    .select('id, nombre, email, password_hash, role, is_banned, is_active')
    .eq('email', email.toLowerCase())
    .single();
  return data || null;
};

// ── Obtener datos de swipe del usuario (join con contador hoy) ────
const getSwipeData = async (userId) => {
  const hoy = new Date().toISOString().split('T')[0];

  const { data: contador } = await supabase
    .from('user_swipe_counters')
    .select('daily_swipe_count, ad_bonus_used, swipe_date')
    .eq('user_id', userId)
    .eq('swipe_date', hoy)
    .single();

  return {
    daily_swipe_count: contador?.daily_swipe_count ?? 0,
    last_swipe_date:   contador?.swipe_date ?? null,
    ad_bonus_used:     contador?.ad_bonus_used ?? 0,
  };
};

// ── Actualizar última actividad ───────────────────────────────────
const updateLastActive = async (userId) => {
  await supabase
    .from('users')
    .update({ last_active_at: new Date().toISOString() })
    .eq('id', userId);
};

// ── Crear usuario ─────────────────────────────────────────────────
const create = async (campos) => {
  const { data, error } = await supabase
    .from('users')
    .insert(campos)
    .select('id, nombre, email, genero, is_verified')
    .single();

  if (error) throw Object.assign(new Error(error.message), { status: 500 });
  return data;
};

// ── Actualizar usuario ────────────────────────────────────────────
const update = async (userId, campos) => {
  const { data, error } = await supabase
    .from('users')
    .update({ ...campos, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw Object.assign(new Error(error.message), { status: 500 });
  return data;
};

module.exports = {
  findById,
  findByEmail,
  getSwipeData,
  updateLastActive,
  create,
  update,
};

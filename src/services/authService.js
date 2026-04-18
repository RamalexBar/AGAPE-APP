const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');
const env = require('../config/env');
const { generateTokens } = require('../middlewares/auth');
const logger = require('../config/logger');

const SALT_ROUNDS = 12;

const register = async ({ nombre, email, password, genero, fecha_nacimiento, referral_code = null, accepted_terms = false }) => {
  // ── Validación de edad mínima 18 años (App Store / Play Store) ──
  if (!fecha_nacimiento) {
    const err = new Error('La fecha de nacimiento es obligatoria.');
    err.status = 400; throw err;
  }
  const birthDate = new Date(fecha_nacimiento);
  if (isNaN(birthDate.getTime())) {
    const err = new Error('Fecha de nacimiento inválida. Usa formato AAAA-MM-DD.');
    err.status = 400; throw err;
  }
  const edadMs   = Date.now() - birthDate.getTime();
  const edadAnios = edadMs / (1000 * 60 * 60 * 24 * 365.25);
  if (edadAnios < 18) {
    const err = new Error('Debes tener al menos 18 años para usar Ágape.');
    err.status = 403; err.code = 'AUTH_UNDERAGE'; throw err;
  }
  if (edadAnios > 120) {
    const err = new Error('Fecha de nacimiento inválida.');
    err.status = 400; throw err;
  }

  // ── Consentimiento legal obligatorio ──
  if (!accepted_terms) {
    const err = new Error('Debes aceptar los Términos de Uso y la Política de Privacidad para continuar.');
    err.status = 400; err.code = 'AUTH_TERMS_NOT_ACCEPTED'; throw err;
  }

  const { data: existente } = await supabase
    .from('users').select('id').eq('email', email.toLowerCase()).single();
  if (existente) {
    const err = new Error('Email ya registrado.');
    err.status = 409;
    err.code = 'AUTH_EMAIL_EXISTS';
    throw err;
  }

  const hash = await bcrypt.hash(password, SALT_ROUNDS);

  const { data: user, error } = await supabase
    .from('users')
    .insert({ 
      nombre, 
      email: email.toLowerCase(), 
      password_hash: hash, 
      genero, 
      fecha_nacimiento, 
      is_active: true, 
      is_verified: false, 
      is_banned: false, 
      accepted_terms: true,
      accepted_terms_at: new Date().toISOString(),
      last_active_at: new Date().toISOString(), 
      created_at: new Date().toISOString() 
    })
    .select('id, nombre, email, genero, is_verified').single();

  if (error) {
    logger.error({ error }, 'Error al crear usuario en Supabase');
    throw new Error('Error al crear usuario.');
  }

  await supabase.from('spiritual_profiles').insert({ user_id: user.id, total_xp: 0, nivel: 1, racha_devocional: 0, monedas_fe: 100 });
  await supabase.from('profiles').insert({ user_id: user.id, fotos: [], intereses: [] });

  // Aplicar código de referido si existe
  let referralResult = null;
  if (referral_code) {
    try {
      const referralService = require('./referralService');
      referralResult = await referralService.aplicarCodigo(user.id, referral_code);
    } catch (err) {
      logger.warn({ err, userId: user.id }, 'Error al aplicar código de referido');
    }
  }

  const tokens = generateTokens(user);
  return { user, ...tokens, referido: referralResult };
};

const login = async ({ email, password }) => {
  const { data: user } = await supabase
    .from('users').select('id, nombre, email, password_hash, role, is_banned, is_active').eq('email', email.toLowerCase()).single();

  if (!user) {
    const err = new Error('Credenciales inválidas.');
    err.status = 401;
    err.code = 'AUTH_INVALID_CREDENTIALS';
    throw err;
  }
  
  if (user.is_banned) {
    const err = new Error('Cuenta suspendida.');
    err.status = 403;
    err.code = 'AUTH_ACCOUNT_BANNED';
    throw err;
  }
  
  if (!user.is_active) {
    const err = new Error('Cuenta inactiva.');
    err.status = 403;
    err.code = 'AUTH_ACCOUNT_INACTIVE';
    throw err;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    const err = new Error('Credenciales inválidas.');
    err.status = 401;
    err.code = 'AUTH_INVALID_CREDENTIALS';
    throw err;
  }

  await supabase.from('users').update({ last_active_at: new Date().toISOString() }).eq('id', user.id);

  const { password_hash, ...safe } = user;
  return { user: safe, ...generateTokens(safe) };
};

const refreshToken = async (token) => {
  let payload;
  try { 
    payload = jwt.verify(token, env.JWT_REFRESH_SECRET); 
  } catch (err) { 
    const error = new Error('Refresh token inválido o expirado.');
    error.status = 401;
    error.code = 'AUTH_INVALID_REFRESH_TOKEN';
    throw error;
  }

  if (payload.type !== 'refresh') {
    const err = new Error('Token de tipo inválido.');
    err.status = 401;
    err.code = 'AUTH_INVALID_TOKEN_TYPE';
    throw err;
  }

  const { data: user } = await supabase.from('users').select('id, email, role, is_banned, is_active').eq('id', payload.sub).single();
  
  if (!user || user.is_banned || !user.is_active) {
    const err = new Error('Usuario no disponible o cuenta suspendida.');
    err.status = 401;
    err.code = 'AUTH_USER_UNAVAILABLE';
    throw err;
  }

  return generateTokens(user);
};

const changePassword = async (userId, { currentPassword, newPassword }) => {
  const { data: user } = await supabase.from('users').select('password_hash').eq('id', userId).single();
  
  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) {
    const err = new Error('Contraseña actual incorrecta.');
    err.status = 400;
    err.code = 'AUTH_INVALID_CURRENT_PASSWORD';
    throw err;
  }
  
  const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await supabase.from('users').update({ password_hash: hash }).eq('id', userId);
  
  return { success: true, mensaje: 'Contraseña actualizada correctamente.' };
};

module.exports = { register, login, refreshToken, changePassword };

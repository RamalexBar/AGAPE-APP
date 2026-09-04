// src/services/passwordResetService.js
// Recuperación de contraseña por email con código de 6 dígitos.
// (Antes generaba un link web, pero la app no tiene sitio web ni deep
// link configurado para completarlo — un código que se escribe a mano
// en la propia app es el flujo estándar para apps 100% móviles.)
const crypto   = require('crypto');
const bcrypt   = require('bcryptjs');
const supabase = require('../config/supabase');
const { sendPasswordResetCode } = require('./emailService');

const CODE_EXPIRY_MINUTES = 30;

const generarCodigo = () => String(crypto.randomInt(100000, 1000000));
// token_hash tiene UNIQUE en la BD: se incluye el user_id en el hash para
// que dos usuarios distintos (o el mismo, en solicitudes separadas) nunca
// choquen aunque el código de 6 dígitos generado al azar coincida.
const hashCodigo = (userId, codigo) => crypto.createHash('sha256').update(`${userId}:${codigo}`).digest('hex');

// ── Generar y enviar código de reset ─────────────────────────────
const solicitarReset = async (email) => {
  const emailLower = email.toLowerCase();

  const { data: user } = await supabase
    .from('users')
    .select('id, nombre, email, is_active, is_banned')
    .eq('email', emailLower)
    .single();

  // Respuesta genérica siempre — no revelar si el email existe
  const respuestaGenerica = { mensaje: 'Si ese correo existe, recibirás un código en breve. Revisa también la carpeta de spam.' };

  if (!user || !user.is_active || user.is_banned) return respuestaGenerica;

  // Invalidar códigos anteriores del mismo usuario
  await supabase.from('password_resets').update({ usado: true }).eq('user_id', user.id).eq('usado', false);

  const codigo    = generarCodigo();
  const tokenHash = hashCodigo(user.id, codigo);
  const expira    = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000).toISOString();

  await supabase.from('password_resets').insert({
    user_id:    user.id,
    token_hash: tokenHash,
    expira_at:  expira,
    usado:      false,
  });

  await sendPasswordResetCode({ to: user.email, nombre: user.nombre, codigo });

  return respuestaGenerica;
};

// ── Validar código y cambiar contraseña ───────────────────────────
const confirmarReset = async (email, codigo, newPassword) => {
  const emailLower = email.toLowerCase();

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', emailLower)
    .single();
  if (!user) throw Object.assign(new Error('Código inválido.'), { status: 400 });

  const tokenHash = hashCodigo(user.id, codigo);

  const { data: resetRecord } = await supabase
    .from('password_resets')
    .select('id, user_id, expira_at, usado')
    .eq('user_id', user.id)
    .eq('token_hash', tokenHash)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!resetRecord)               throw Object.assign(new Error('Código inválido.'),  { status: 400 });
  if (resetRecord.usado)          throw Object.assign(new Error('Código ya usado.'),  { status: 400 });
  if (new Date(resetRecord.expira_at) < new Date())
                                  throw Object.assign(new Error('Código expirado.'),  { status: 400 });

  const hash = await bcrypt.hash(newPassword, 12);

  await supabase.from('users').update({ password_hash: hash, updated_at: new Date().toISOString() }).eq('id', resetRecord.user_id);
  await supabase.from('password_resets').update({ usado: true }).eq('id', resetRecord.id);

  return { mensaje: 'Contraseña actualizada. Ya puedes iniciar sesión. 🙏' };
};

module.exports = { solicitarReset, confirmarReset };

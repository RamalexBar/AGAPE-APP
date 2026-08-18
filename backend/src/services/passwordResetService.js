// src/services/passwordResetService.js
// Recuperación de contraseña por email con token seguro
const crypto   = require('crypto');
const bcrypt   = require('bcryptjs');
const supabase = require('../config/supabase');

const TOKEN_EXPIRY_MINUTES = 30;

// ── Generar y guardar token de reset ─────────────────────────────
const solicitarReset = async (email) => {
  const emailLower = email.toLowerCase();

  const { data: user } = await supabase
    .from('users')
    .select('id, nombre, email, is_active, is_banned')
    .eq('email', emailLower)
    .single();

  // Respuesta genérica siempre — no revelar si el email existe
  const respuestaGenerica = { mensaje: 'Si ese correo existe, recibirás instrucciones en breve. Revisa también la carpeta de spam.' };

  if (!user || !user.is_active || user.is_banned) return respuestaGenerica;

  // Invalidar tokens anteriores del mismo usuario
  await supabase.from('password_resets').update({ usado: true }).eq('user_id', user.id).eq('usado', false);

  // Generar token seguro
  const token     = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expira    = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000).toISOString();

  await supabase.from('password_resets').insert({
    user_id:    user.id,
    token_hash: tokenHash,
    expira_at:  expira,
    usado:      false,
  });

  // En producción: enviar email con link que incluya el token
  // Por ahora: loguear (integrar con SendGrid / Resend / SES)
  const resetLink = `${process.env.FRONTEND_URL || 'https://agape-app.com'}/reset-password?token=${token}`;
  console.log(`[PasswordReset] Link para ${emailLower}: ${resetLink}`);

  // TODO: await emailService.sendPasswordReset({ to: user.email, nombre: user.nombre, resetLink });

  return respuestaGenerica;
};

// ── Validar token y cambiar contraseña ───────────────────────────
const confirmarReset = async (token, newPassword) => {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const { data: resetRecord } = await supabase
    .from('password_resets')
    .select('id, user_id, expira_at, usado')
    .eq('token_hash', tokenHash)
    .single();

  if (!resetRecord)               throw Object.assign(new Error('Token inválido.'),  { status: 400 });
  if (resetRecord.usado)          throw Object.assign(new Error('Token ya usado.'),  { status: 400 });
  if (new Date(resetRecord.expira_at) < new Date())
                                  throw Object.assign(new Error('Token expirado.'),  { status: 400 });

  const hash = await bcrypt.hash(newPassword, 12);

  await supabase.from('users').update({ password_hash: hash, updated_at: new Date().toISOString() }).eq('id', resetRecord.user_id);
  await supabase.from('password_resets').update({ usado: true }).eq('id', resetRecord.id);

  return { mensaje: 'Contraseña actualizada. Ya puedes iniciar sesión. 🙏' };
};

module.exports = { solicitarReset, confirmarReset };

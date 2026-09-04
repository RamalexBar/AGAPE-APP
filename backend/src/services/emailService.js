// src/services/emailService.js — envío de correos transaccionales vía SMTP
const nodemailer = require('nodemailer');

let transporter = null;
const smtpConfigurado = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

if (smtpConfigurado) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_PORT === '465',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

const FROM = process.env.SMTP_FROM || 'Ágape <no-reply@agapeapp.co>';

// Envía un correo. Si no hay SMTP configurado (desarrollo local), registra el
// contenido en consola en vez de fallar, para no romper el flujo.
const enviarCorreo = async ({ to, subject, html, text }) => {
  if (!transporter) {
    console.log(`[EmailService] SMTP no configurado — correo simulado a ${to}: ${subject}\n${text || html}`);
    return { simulado: true };
  }
  try {
    await transporter.sendMail({ from: FROM, to, subject, html, text });
    return { simulado: false };
  } catch (e) {
    console.error('[EmailService] Error enviando correo:', e.message);
    throw Object.assign(new Error('No se pudo enviar el correo.'), { status: 502 });
  }
};

const sendPasswordResetCode = async ({ to, nombre, codigo }) => {
  const primerNombre = (nombre || 'ahí').split(' ')[0];
  await enviarCorreo({
    to,
    subject: `${codigo} es tu código para restablecer tu contraseña — Ágape`,
    text: `Hola ${primerNombre},\n\nTu código para restablecer tu contraseña en Ágape es: ${codigo}\n\nEste código vence en 30 minutos. Si no lo solicitaste, ignora este correo.`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color:#C44DFF;">Ágape</h2>
        <p>Hola ${primerNombre},</p>
        <p>Tu código para restablecer tu contraseña es:</p>
        <p style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #1a0533;">${codigo}</p>
        <p style="color:#666; font-size: 13px;">Este código vence en 30 minutos. Si no solicitaste este cambio, puedes ignorar este correo con tranquilidad.</p>
      </div>
    `,
  });
};

module.exports = { enviarCorreo, sendPasswordResetCode, smtpConfigurado };

// src/routes/legal.js
const router = require('express').Router();
const { body } = require('express-validator');
const { validate } = require('../middlewares/validate');
const { authenticateToken } = require('../middlewares/auth');
const legalService = require('../services/legalService');

// GET /api/legal/privacy  → Política de privacidad
router.get('/privacy', (req, res, next) => {
  try {
    const contenido = legalService.getLegalDoc('privacy');
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.send(contenido);
  } catch (e) { next(e); }
});

// GET /api/legal/terms  → Términos de servicio
router.get('/terms', (req, res, next) => {
  try {
    const contenido = legalService.getLegalDoc('terms');
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.send(contenido);
  } catch (e) { next(e); }
});

// GET /api/legal/delete-account  → Página pública de solicitud de eliminación de cuenta
router.get('/delete-account', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Eliminar cuenta — Ágape</title>
  <style>
    body { font-family: sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; background: #0a0a14; color: #fff; }
    h1 { color: #C9A84C; }
    p { line-height: 1.6; color: rgba(255,255,255,0.8); }
    .card { background: rgba(255,255,255,0.05); border-radius: 12px; padding: 24px; margin: 20px 0; }
    a { color: #C9A84C; }
    .warning { color: #ff6b6b; font-weight: bold; }
  </style>
</head>
<body>
  <h1>✝️ Ágape — Eliminar cuenta</h1>
  <div class="card">
    <p>Para solicitar la eliminación de tu cuenta y todos tus datos personales de Ágape, puedes hacerlo de dos formas:</p>
    <h3>Opción 1 — Desde la app (recomendado)</h3>
    <p>Abre la app → ve a <strong>Perfil → Configuración → Eliminar cuenta</strong>. La eliminación es inmediata.</p>
    <h3>Opción 2 — Por correo electrónico</h3>
    <p>Envía un correo a <a href="mailto:agapeconections@gmail.com">agapeconections@gmail.com</a> con el asunto <strong>"Solicitud de eliminación de cuenta"</strong> e incluye el correo asociado a tu cuenta.</p>
    <p>Procesaremos tu solicitud en un plazo máximo de <strong>30 días</strong>.</p>
  </div>
  <div class="card">
    <p class="warning">⚠️ La eliminación de tu cuenta es permanente e irreversible.</p>
    <p>Se borrarán: tu perfil, fotos, mensajes, matches y todos los datos asociados a tu cuenta.</p>
  </div>
  <p>Para más información consulta nuestra <a href="/api/legal/privacy">Política de Privacidad</a>.</p>
</body>
</html>`);
});

// GET /api/legal/versions  → Versiones actuales (para que el frontend compare)
router.get('/versions', (req, res) => {
  res.json({
    terms_version:   legalService.CURRENT_TERMS_VERSION,
    privacy_version: legalService.CURRENT_PRIVACY_VERSION,
  });
});

// POST /api/legal/accept  → Registrar aceptación de términos
router.post('/accept',
  authenticateToken,
  body('terms_version').notEmpty(),
  body('privacy_version').notEmpty(),
  validate,
  async (req, res, next) => {
    try {
      await legalService.registrarConsentimiento(req.user.id, {
        terms_version:   req.body.terms_version,
        privacy_version: req.body.privacy_version,
        ip:              req.ip,
        user_agent:      req.headers['user-agent'],
      });
      res.json({ success: true, mensaje: 'Términos aceptados. ¡Bienvenido a Ágape! ✝️' });
    } catch (e) { next(e); }
  }
);

// GET /api/legal/status  → ¿Ha aceptado la versión actual?
router.get('/status', authenticateToken, async (req, res, next) => {
  try {
    const status = await legalService.verificarConsentimientoActual(req.user.id);
    res.json(status);
  } catch (e) { next(e); }
});


// GET /api/legal/child-safety
router.get('/child-safety', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Seguridad Infantil - Agape</title>
  <style>
    body { font-family: sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; background: #0a0a14; color: #fff; }
    h1 { color: #C9A84C; }
    h2 { color: #C9A84C; font-size: 18px; margin-top: 30px; }
    p { line-height: 1.6; color: rgba(255,255,255,0.8); }
    .card { background: rgba(255,255,255,0.05); border-radius: 12px; padding: 24px; margin: 20px 0; }
    a { color: #C9A84C; }
  </style>
</head>
<body>
  <h1>Agape - Estandares de Seguridad Infantil</h1>
  <p>Agape es una app de citas para adultos mayores de 18 anos. Nos comprometemos con la proteccion de menores.</p>
  <div class="card">
    <h2>Prohibiciones absolutas</h2>
    <p>Agape prohibe estrictamente cualquier contenido que explote, abuse o ponga en peligro a menores, incluyendo material de abuso sexual infantil (CSAM).</p>
  </div>
  <div class="card">
    <h2>Verificacion de edad</h2>
    <p>Todos los usuarios deben proporcionar su fecha de nacimiento. Los menores de 18 anos no pueden crear cuenta ni acceder a la plataforma.</p>
  </div>
  <div class="card">
    <h2>Mecanismos de denuncia</h2>
    <p>Los usuarios pueden denunciar contenido inapropiado desde la app. Para denunciar un problema de seguridad infantil: <a href="mailto:agapeconections@gmail.com">agapeconections@gmail.com</a></p>
  </div>
  <div class="card">
    <h2>Cumplimiento legal</h2>
    <p>Agape cumple con todas las leyes de proteccion infantil y reporta casos de CSAM a las autoridades competentes incluyendo NCMEC cuando corresponda.</p>
  </div>
</body>
</html>`);
});

module.exports = router;

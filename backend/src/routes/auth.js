// src/routes/auth.js
const router = require('express').Router();
const { body } = require('express-validator');
const { validate } = require('../middlewares/validate');
const { authenticateToken } = require('../middlewares/auth');
const authService = require('../services/authService');
const { solicitarReset, confirmarReset } = require('../services/passwordResetService');
const legalService = require('../services/legalService');

// POST /api/auth/register  â€” incluye referral_code + consent obligatorio
router.post('/register',
  body('nombre').trim().notEmpty().isLength({ min: 2, max: 60 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('MÃ­nimo 8 caracteres.'),
  body('genero').isIn(['M', 'F', 'otro']),
  body('fecha_nacimiento').optional().isISO8601(),
  body('referral_code').optional().isString().isLength({ min: 6, max: 12 }),
  body('accepted_terms').equals('true').withMessage('Debes aceptar los tÃ©rminos de servicio.'),
  body('accepted_privacy').equals('true').withMessage('Debes aceptar la polÃ­tica de privacidad.'),
  validate,
  async (req, res, next) => {
    try {
      const resultado = await authService.register(req.body);

      // Registrar consentimiento legal
      await legalService.registrarConsentimiento(resultado.user.id, {
        terms_version:   legalService.CURRENT_TERMS_VERSION,
        privacy_version: legalService.CURRENT_PRIVACY_VERSION,
        ip:              req.ip,
        user_agent:      req.headers['user-agent'],
      });

      res.status(201).json(resultado);
    } catch (e) { next(e); }
  }
);

// POST /api/auth/login
router.post('/login',
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  validate,
  async (req, res, next) => {
    try { res.json(await authService.login(req.body)); }
    catch (e) { next(e); }
  }
);

// POST /api/auth/refresh
router.post('/refresh',
  body('refreshToken').notEmpty(),
  validate,
  async (req, res, next) => {
    try { res.json(await authService.refreshToken(req.body.refreshToken)); }
    catch (e) { next(e); }
  }
);

// PUT /api/auth/password  (autenticado)
router.put('/password', authenticateToken,
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 8 }),
  validate,
  async (req, res, next) => {
    try { res.json(await authService.changePassword(req.user.id, req.body)); }
    catch (e) { next(e); }
  }
);

// POST /api/auth/forgot-password  (solicitar reset por email)
router.post('/forgot-password',
  body('email').isEmail().normalizeEmail(),
  validate,
  async (req, res, next) => {
    try { res.json(await solicitarReset(req.body.email)); }
    catch (e) { next(e); }
  }
);

// POST /api/auth/reset-password  (confirmar con código de 6 dígitos enviado por email)
router.post('/reset-password',
  body('email').isEmail().normalizeEmail(),
  body('codigo').isLength({ min: 6, max: 6 }),
  body('newPassword').isLength({ min: 8 }),
  validate,
  async (req, res, next) => {
    try { res.json(await confirmarReset(req.body.email, req.body.codigo, req.body.newPassword)); }
    catch (e) { next(e); }
  }
);

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const profileService = require('../services/profileService');
    res.json(await profileService.getMyProfile(req.user.id));
  } catch (e) { next(e); }
});

// POST /api/auth/logout
router.post('/logout', authenticateToken, (req, res) => {
  res.json({ success: true, mensaje: 'Sesion cerrada.' });
});

// POST /api/auth/google
// El cliente solo envía el accessToken de Google — el backend lo verifica
// directamente contra la API de Google y usa esos datos verificados
// (nunca confía en email/nombre/id enviados por el cliente).
router.post('/google',
  body('accessToken').notEmpty().withMessage('accessToken requerido.'),
  validate,
  async (req, res, next) => {
    try {
      const axios = require('axios');
      const supabase = require('../config/supabase');
      const { generateTokens } = require('../middlewares/auth');

      let googleUser;
      try {
        const { data } = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${req.body.accessToken}` },
          timeout: 8000,
        });
        googleUser = data;
      } catch {
        return res.status(401).json({ error: { code: 'INVALID_GOOGLE_TOKEN', message: 'Token de Google inválido o expirado.' } });
      }

      if (!googleUser?.email || googleUser.email_verified === false) {
        return res.status(401).json({ error: { code: 'UNVERIFIED_EMAIL', message: 'No se pudo verificar el correo de Google.' } });
      }

      const email     = googleUser.email;
      const nombre    = googleUser.name || email.split('@')[0];
      const google_id = googleUser.sub;

      // Buscar usuario existente
      let { data: user } = await supabase
        .from('users')
        .select('id, nombre, email, genero, is_verified')
        .eq('email', email)
        .single();

      // Si no existe, crearlo
      if (!user) {
        const { data: newUser, error } = await supabase
          .from('users')
          .insert({
            nombre,
            email,
            password_hash: 'GOOGLE_AUTH_' + google_id,
            genero: 'otro',
            fecha_nacimiento: '2000-01-01',
            is_active: true,
            is_verified: true,
            is_banned: false,
            last_active_at: new Date().toISOString(),
            created_at: new Date().toISOString()
          })
          .select('id, nombre, email, genero, is_verified')
          .single();

        if (error) throw new Error('Error al crear usuario con Google.');
        user = newUser;

        try { await supabase.from('profiles').insert({ user_id: user.id, fotos: [], intereses: [] }); } catch(e) {}
        try { await supabase.from('spiritual_profiles').insert({ user_id: user.id, total_xp: 0, nivel: 1, racha_devocional: 0, monedas_fe: 100 }); } catch(e) {}
      }

      const tokens = generateTokens(user);
      res.json({ user, ...tokens });
    } catch (e) { next(e); }
  }
);

module.exports = router;



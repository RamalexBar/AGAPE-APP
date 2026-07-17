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

// POST /api/auth/reset-password  (confirmar con token)
router.post('/reset-password',
  body('token').notEmpty(),
  body('newPassword').isLength({ min: 8 }),
  validate,
  async (req, res, next) => {
    try { res.json(await confirmarReset(req.body.token, req.body.newPassword)); }
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
router.post('/google',
  body('email').isEmail().normalizeEmail(),
  body('nombre').trim().notEmpty(),
  body('google_id').notEmpty(),
  validate,
  async (req, res, next) => {
    try {
      const { email, nombre, google_id } = req.body;
      const supabase = require('../config/supabase');
      const { generateTokens } = require('../middlewares/auth');

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



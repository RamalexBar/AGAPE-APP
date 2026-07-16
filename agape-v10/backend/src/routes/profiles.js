// src/routes/profiles.js
const router = require('express').Router();
const { body } = require('express-validator');
const { validate } = require('../middlewares/validate');
const { authenticateToken } = require('../middlewares/auth');
const profileService = require('../services/profileService');
const { deleteAccountPermanently } = require('../services/accountDeletionService');

const INTENCION_VALIDA     = ['amistad', 'noviazgo_cristiano', 'matrimonio'];
const COMPROMISO_VALIDO    = ['casual', 'serio', 'muy_serio'];
const FRECUENCIA_IG_VALIDA = ['nunca', 'mensual', 'semanal', 'diaria'];

// GET /api/profiles/me
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const perfil = await profileService.getMyProfile(req.user.id);
    const completitud = profileService.calcularCompletitud(perfil);
    res.json({ ...perfil, completitud });
  } catch (e) { next(e); }
});

// GET /api/profiles/me/completeness
router.get('/me/completeness', authenticateToken, async (req, res, next) => {
  try {
    const perfil = await profileService.getMyProfile(req.user.id);
    res.json(profileService.calcularCompletitud(perfil));
  } catch (e) { next(e); }
});

// PUT /api/profiles/me
router.put('/me', authenticateToken,
  body('nombre').optional().trim().isLength({ min: 2, max: 60 }),
  body('bio').optional().isLength({ max: 500 }),
  body('denomination').optional().isString(),
  body('connection_purpose').optional().isIn(['friendship', 'community', 'marriage']),
  body('intencion_relacion').optional().isIn(INTENCION_VALIDA),
  body('nivel_compromiso').optional().isIn(COMPROMISO_VALIDO),
  body('frecuencia_iglesia').optional().isIn(FRECUENCIA_IG_VALIDA),
  body('valores').optional().isArray(),
  validate,
  async (req, res, next) => {
    try { res.json(await profileService.updateProfile(req.user.id, req.body)); }
    catch (e) { next(e); }
  }
);

// PUT /api/profiles/me/photos
router.put('/me/photos', authenticateToken,
  body('fotos').isArray({ max: 6 }),
  validate,
  async (req, res, next) => {
    try { res.json(await profileService.updatePhotos(req.user.id, req.body.fotos)); }
    catch (e) { next(e); }
  }
);

// DELETE /api/profiles/me — Borrado total (App Store Requirement)
router.delete('/me', authenticateToken, async (req, res, next) => {
  try { res.json(await deleteAccountPermanently(req.user.id)); }
  catch (e) { next(e); }
});

// GET /api/profiles/:id
router.get('/:id', authenticateToken, async (req, res, next) => {
  try { res.json(await profileService.getProfile(req.params.id)); }
  catch (e) { next(e); }
});

module.exports = router;

// ── Modo Invisible (Premium) ────────────────────────────────────────
// GET /api/profiles/me/invisible
router.get('/me/invisible', authenticateToken, async (req, res, next) => {
  try {
    const { data, error } = await require('../config/supabase')
      .from('profiles')
      .select('modo_invisible')
      .eq('user_id', req.user.id)
      .single();
    if (error) throw error;
    res.json({ modo_invisible: data?.modo_invisible || false });
  } catch (e) { next(e); }
});

// POST /api/profiles/me/invisible
router.post('/me/invisible', authenticateToken, async (req, res, next) => {
  try {
    const { user } = req;
    // Solo premium puede activar modo invisible
    const { data: sub } = await require('../config/supabase')
      .from('subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!sub && req.body.activo) {
      return res.status(403).json({
        success: false,
        error: { code: 'PREMIUM_REQUIRED', message: 'El modo invisible es exclusivo para Premium.' },
      });
    }

    const { error } = await require('../config/supabase')
      .from('profiles')
      .update({ modo_invisible: req.body.activo === true })
      .eq('user_id', user.id);

    if (error) throw error;
    res.json({ success: true, modo_invisible: req.body.activo === true });
  } catch (e) { next(e); }
});

// ── Usuarios activos (ActiveNowScreen) ──────────────────────────────
// GET /api/profiles/active
router.get('/active', authenticateToken, async (req, res, next) => {
  try {
    const hace = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data, error } = await require('../config/supabase')
      .from('users')
      .select('id, nombre, ubicacion_ciudad, last_active_at, profiles(fotos)')
      .gt('last_active_at', hace)
      .neq('id', req.user.id)
      .limit(50);
    if (error) throw error;
    const perfiles = (data || []).map(u => ({
      user_id: u.id,
      nombre: u.nombre,
      ciudad: u.ubicacion_ciudad,
      ultima_actividad: u.last_active_at,
      fotos: u.profiles?.fotos || [],
    }));
    res.json({ perfiles, total: perfiles.length });
  } catch (e) { next(e); }
});

// GET /api/profiles/active/count
router.get('/active/count', authenticateToken, async (req, res, next) => {
  try {
    const hace = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { count, error } = await require('../config/supabase')
      .from('users')
      .select('id', { count: 'exact', head: true })
      .gt('last_active_at', hace)
      .neq('id', req.user.id);
    if (error) throw error;
    res.json({ total_activos: count || 0 });
  } catch (e) { next(e); }
});

// src/routes/profiles.js
const router = require('express').Router();
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { body } = require('express-validator');
const { validate } = require('../middlewares/validate');
const { authenticateToken } = require('../middlewares/auth');
const profileService = require('../services/profileService');
const { deleteAccountPermanently } = require('../services/accountDeletionService');
const supabase = require('../config/supabase');

const BUCKET_FOTOS = 'avatars';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB máximo por foto
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(Object.assign(new Error('Solo se permiten archivos de imagen.'), { status: 400 }));
    }
    cb(null, true);
  },
});

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
  body('intereses').optional().isArray({ max: 8 }),
  body('busca_genero').optional().isIn(['hombres', 'mujeres', 'todos']),
  validate,
  async (req, res, next) => {
    try { res.json(await profileService.updateProfile(req.user.id, req.body)); }
    catch (e) { next(e); }
  }
);

// POST /api/profiles/me/photos — sube un archivo real de foto (multipart/form-data, campo 'photo')
router.post('/me/photos', authenticateToken, upload.single('photo'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió ningún archivo.' });
    }

    const { data: perfilRow } = await supabase
      .from('profiles')
      .select('fotos')
      .eq('user_id', req.user.id)
      .maybeSingle();
    const fotosActuales = perfilRow?.fotos || [];

    if (fotosActuales.length >= 6) {
      return res.status(400).json({ error: 'Ya tienes el máximo de 6 fotos.' });
    }

    const ext = (req.file.mimetype.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
    const path = `${req.user.id}/${uuidv4()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_FOTOS)
      .upload(path, req.file.buffer, { contentType: req.file.mimetype, upsert: false });

    if (uploadError) {
      throw Object.assign(new Error('Error al subir la imagen: ' + uploadError.message), { status: 500 });
    }

    const { data: pub } = supabase.storage.from(BUCKET_FOTOS).getPublicUrl(path);
    const nuevaUrl = pub.publicUrl;
    const nuevasFotos = [...fotosActuales, nuevaUrl];

    await profileService.updatePhotos(req.user.id, nuevasFotos);

    res.status(201).json({ url: nuevaUrl, fotos: nuevasFotos });
  } catch (e) { next(e); }
});

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
    const { obtenerSuscripcion } = require('../services/monetizationAgapeService');
    const suscripcion = await obtenerSuscripcion(user.id);

    if (!suscripcion.es_premium && req.body.activo) {
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
    const db = require('../config/supabase');
    const hace = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    const [{ data, error }, { data: bloqueados }] = await Promise.all([
      db.from('users')
        .select('id, nombre, edad, bio, ubicacion_ciudad, last_active_at, profiles(fotos, intereses, modo_invisible)')
        .gt('last_active_at', hace)
        .neq('id', req.user.id)
        .limit(50),
      db.from('blocked_users')
        .select('blocker_id, blocked_id')
        .or(`blocker_id.eq.${req.user.id},blocked_id.eq.${req.user.id}`),
    ]);
    if (error) throw error;

    const idsExcluidos = new Set(
      (bloqueados || []).map(b => (b.blocker_id === req.user.id ? b.blocked_id : b.blocker_id))
    );

    const perfiles = (data || [])
      .filter(u => !idsExcluidos.has(u.id) && !u.profiles?.modo_invisible)
      .map(u => ({
        id: u.id,
        nombre: u.nombre,
        edad: u.edad,
        ciudad: u.ubicacion_ciudad,
        ultima_actividad: u.last_active_at,
        profiles: { fotos: u.profiles?.fotos || [], bio: u.bio, intereses: u.profiles?.intereses || [] },
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

// GET /api/profiles/:id — debe ir AL FINAL: es una ruta comodín de un solo
// segmento que de otro modo interceptaría /active, /me/invisible, etc.
router.get('/:id', authenticateToken, async (req, res, next) => {
  try { res.json(await profileService.getProfile(req.params.id)); }
  catch (e) { next(e); }
});

module.exports = router;

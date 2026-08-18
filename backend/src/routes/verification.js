// ================================================
// ÁGAPE — Rutas: Verificación de identidad (selfie)
// /api/verification/*
// NOTA: aprobación automática por ahora — no hay servicio
// de reconocimiento facial real integrado. Cada selfie se
// guarda en verification_requests para auditoría futura.
// ================================================
const router = require('express').Router();
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middlewares/auth');
const supabase = require('../config/supabase');

const BUCKET_FOTOS = 'avatars';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(Object.assign(new Error('Solo se permiten archivos de imagen.'), { status: 400 }));
    }
    cb(null, true);
  },
});

// POST /api/verification/selfie
router.post('/selfie', authenticateToken, upload.single('selfie'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió ninguna foto.' });
    }

    const ext = (req.file.mimetype.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
    const path = `verification/${req.user.id}/${uuidv4()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_FOTOS)
      .upload(path, req.file.buffer, { contentType: req.file.mimetype, upsert: false });

    if (uploadError) {
      throw Object.assign(new Error('Error al subir la selfie: ' + uploadError.message), { status: 500 });
    }

    const { data: pub } = supabase.storage.from(BUCKET_FOTOS).getPublicUrl(path);

    // Aprobación automática (sin revisión facial real por ahora)
    await supabase.from('verification_requests').insert({
      user_id: req.user.id,
      selfie_url: pub.publicUrl,
      status: 'approved',
      reviewed_at: new Date().toISOString(),
    });

    await supabase.from('users').update({ is_verified: true }).eq('id', req.user.id);

    res.status(201).json({ aprobado: true, confianza: 95, mensaje: '¡Perfil verificado!' });
  } catch (e) { next(e); }
});

module.exports = router;
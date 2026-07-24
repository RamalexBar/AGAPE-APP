// ================================================
// ÁGAPE — Rutas: Entorno (personas cercanas por ubicación)
// /api/entorno/*
// ================================================
const router = require('express').Router();
const { body, query } = require('express-validator');
const { validate } = require('../middlewares/validate');
const { authenticateToken } = require('../middlewares/auth');
const supabase = require('../config/supabase');
const chatService = require('../services/chatService');
const { calcularEstado } = require('../services/presenceService');

// Fórmula de Haversine — distancia en km entre 2 coordenadas
function distanciaKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// POST /api/entorno/ubicacion — guarda la ubicación actual del usuario
router.post('/ubicacion',
  authenticateToken,
  body('lat').isFloat({ min: -90, max: 90 }),
  body('lon').isFloat({ min: -180, max: 180 }),
  validate,
  async (req, res, next) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ ubicacion_lat: req.body.lat, ubicacion_lon: req.body.lon })
        .eq('id', req.user.id);
      if (error) throw Object.assign(new Error('Error al guardar ubicación.'), { status: 500 });
      res.json({ success: true });
    } catch (e) { next(e); }
  }
);

// GET /api/entorno/cercanos?radio=30 — personas activas dentro del radio (km)
router.get('/cercanos',
  authenticateToken,
  query('radio').optional().isFloat({ min: 1, max: 200 }),
  validate,
  async (req, res, next) => {
    try {
      const radio = parseFloat(req.query.radio) || 30;

      const { data: yo } = await supabase
        .from('users')
        .select('ubicacion_lat, ubicacion_lon')
        .eq('id', req.user.id)
        .single();

      if (!yo?.ubicacion_lat || !yo?.ubicacion_lon) {
        return res.status(400).json({
          error: 'Activa tu ubicación primero.',
          code: 'UBICACION_REQUERIDA',
        });
      }

      const [{ data: candidatos, error }, { data: bloqueados }, { data: invisibles }] = await Promise.all([
        supabase
          .from('users')
          .select('id, nombre, edad, bio, avatar_url, ubicacion_ciudad, ubicacion_lat, ubicacion_lon, last_active_at')
          .eq('is_active', true)
          .eq('is_banned', false)
          .not('ubicacion_lat', 'is', null)
          .not('ubicacion_lon', 'is', null)
          .neq('id', req.user.id)
          .limit(200),
        supabase
          .from('blocked_users')
          .select('blocker_id, blocked_id')
          .or(`blocker_id.eq.${req.user.id},blocked_id.eq.${req.user.id}`),
        supabase
          .from('profiles')
          .select('user_id')
          .eq('modo_invisible', true),
      ]);

      if (error) throw Object.assign(new Error('Error al buscar personas cercanas.'), { status: 500 });

      const idsExcluidos = new Set([
        ...(bloqueados || []).map(b => (b.blocker_id === req.user.id ? b.blocked_id : b.blocker_id)),
        ...(invisibles || []).map(p => p.user_id),
      ]);

      const conDistancia = (candidatos || [])
        .filter(c => !idsExcluidos.has(c.id))
        .map(c => ({
          ...c,
          distancia_km: Math.round(distanciaKm(yo.ubicacion_lat, yo.ubicacion_lon, c.ubicacion_lat, c.ubicacion_lon) * 10) / 10,
        }))
        .filter(c => c.distancia_km <= radio)
        .sort((a, b) => a.distancia_km - b.distancia_km)
        .slice(0, 50);

      const { data: perfilesFotos } = await supabase
        .from('profiles')
        .select('user_id, fotos')
        .in('user_id', conDistancia.map(c => c.id));
      const fotosPorUsuario = new Map((perfilesFotos || []).map(p => [p.user_id, p.fotos || []]));

      const usuarios = conDistancia.map(c => ({
        user_id: c.id,
        nombre: c.nombre,
        edad: c.edad,
        bio: c.bio,
        avatar_url: c.avatar_url,
        ciudad: c.ubicacion_ciudad,
        distancia_km: c.distancia_km,
        fotos: fotosPorUsuario.get(c.id) || [],
        is_online: calcularEstado(c.last_active_at).online,
      }));

      res.json({ usuarios, total: usuarios.length });
    } catch (e) { next(e); }
  }
);

// POST /api/entorno/mensaje — envía un mensaje inicial a alguien cercano (sin necesidad de match previo)
router.post('/mensaje',
  authenticateToken,
  body('destinatario_id').isUUID(),
  body('texto').trim().isLength({ min: 1, max: 500 }),
  validate,
  async (req, res, next) => {
    try {
      const { destinatario_id, texto } = req.body;
      if (destinatario_id === req.user.id) {
        return res.status(400).json({ error: 'No puedes enviarte un mensaje a ti mismo.' });
      }
      const { conversation_id } = await chatService.getOrCreateConversation(req.user.id, destinatario_id);
      const mensaje = await chatService.sendMessage(req.user.id, conversation_id, { content: texto });
      res.status(201).json({ conversation_id, mensaje });
    } catch (e) { next(e); }
  }
);

module.exports = router;
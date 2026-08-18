// ================================================
// ÁGAPE — Rutas: Eventos comunitarios cercanos
// /api/events/*
// ================================================
const router = require('express').Router();
const { body, query } = require('express-validator');
const { validate } = require('../middlewares/validate');
const { authenticateToken } = require('../middlewares/auth');
const supabase = require('../config/supabase');

// GET /api/events/cercanos — eventos futuros (opcionalmente filtrados por ciudad del usuario)
router.get('/cercanos',
  authenticateToken,
  query('radio').optional().isFloat({ min: 1 }),
  validate,
  async (req, res, next) => {
    try {
      const { data: eventos, error } = await supabase
        .from('events')
        .select('id, creador_id, titulo, tipo, ciudad, fecha_evento, max_personas, descripcion, created_at')
        .gte('fecha_evento', new Date().toISOString())
        .order('fecha_evento', { ascending: true })
        .limit(100);

      if (error) throw Object.assign(new Error('Error al obtener eventos.'), { status: 500 });

      const ids = (eventos || []).map(e => e.id);
      const { data: participaciones } = ids.length
        ? await supabase.from('event_participants').select('event_id, user_id').in('event_id', ids)
        : { data: [] };

      const conteoPorEvento = new Map();
      const yoParticipoSet = new Set();
      (participaciones || []).forEach(p => {
        conteoPorEvento.set(p.event_id, (conteoPorEvento.get(p.event_id) || 0) + 1);
        if (p.user_id === req.user.id) yoParticipoSet.add(p.event_id);
      });

      const resultado = (eventos || []).map(e => {
        const participantes = conteoPorEvento.get(e.id) || 0;
        return {
          ...e,
          participantes,
          lleno: participantes >= e.max_personas,
          yo_participo: yoParticipoSet.has(e.id),
        };
      });

      res.json({ eventos: resultado, total: resultado.length });
    } catch (e) { next(e); }
  }
);

// POST /api/events — crear un evento nuevo
router.post('/',
  authenticateToken,
  body('titulo').trim().isLength({ min: 3, max: 120 }),
  body('fecha_evento').isISO8601(),
  body('tipo').optional().isString(),
  body('ciudad').optional().isString(),
  body('max_personas').optional().isInt({ min: 2, max: 200 }),
  body('descripcion').optional().isString(),
  validate,
  async (req, res, next) => {
    try {
      const { titulo, tipo, ciudad, fecha_evento, max_personas, descripcion } = req.body;
      const { data, error } = await supabase
        .from('events')
        .insert({
          creador_id: req.user.id,
          titulo, tipo, ciudad,
          fecha_evento,
          max_personas: max_personas || 10,
          descripcion,
        })
        .select()
        .single();

      if (error) throw Object.assign(new Error('Error al crear el evento.'), { status: 500 });

      // El creador se une automáticamente a su propio evento
      await supabase.from('event_participants').insert({ event_id: data.id, user_id: req.user.id });

      res.status(201).json({ evento: data });
    } catch (e) { next(e); }
  }
);

// POST /api/events/:id/join — unirse a un evento
router.post('/:id/join', authenticateToken, async (req, res, next) => {
  try {
    const eventId = req.params.id;

    const { data: evento } = await supabase
      .from('events')
      .select('id, max_personas')
      .eq('id', eventId)
      .single();

    if (!evento) {
      return res.status(404).json({ error: 'Evento no encontrado.' });
    }

    const { count } = await supabase
      .from('event_participants')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId);

    if ((count || 0) >= evento.max_personas) {
      return res.status(400).json({ error: 'Este evento ya está lleno.' });
    }

    const { error } = await supabase
      .from('event_participants')
      .insert({ event_id: eventId, user_id: req.user.id });

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Ya estás unido a este evento.' });
      }
      throw Object.assign(new Error('Error al unirte al evento.'), { status: 500 });
    }

    res.status(201).json({ success: true });
  } catch (e) { next(e); }
});

module.exports = router;
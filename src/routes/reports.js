// src/routes/reports.js
const router = require('express').Router();
const { body } = require('express-validator');
const { validate } = require('../middlewares/validate');
const { authenticateToken } = require('../middlewares/auth');
const supabase = require('../config/supabase');

const RAZONES_VALIDAS = [
  'comportamiento_inapropiado',
  'lenguaje_ofensivo',
  'perfil_falso',
  'spam',
  'contenido_no_cristiano',
  'acoso',
  'otro',
];

// POST /api/reports
// Reportar a un usuario
router.post('/',
  authenticateToken,
  body('reported_user_id').notEmpty().withMessage('ID de usuario requerido.'),
  body('razon').isIn(RAZONES_VALIDAS).withMessage('Razón inválida.'),
  body('descripcion').optional().isLength({ max: 500 }),
  validate,
  async (req, res, next) => {
    try {
      const { reported_user_id, razon, descripcion } = req.body;

      if (reported_user_id === req.user.id) {
        return res.status(400).json({ error: 'No puedes reportarte a ti mismo.' });
      }

      // Verificar reporte duplicado reciente (últimas 24h)
      const hace24h = new Date(Date.now() - 86400000).toISOString();
      const { data: existe } = await supabase
        .from('reports')
        .select('id')
        .eq('reporter_id', req.user.id)
        .eq('reported_id', reported_user_id)
        .gte('created_at', hace24h)
        .single();

      if (existe) {
        return res.status(429).json({ error: 'Ya reportaste a este usuario recientemente.' });
      }

      const { error } = await supabase.from('reports').insert({
        reporter_id: req.user.id,
        reported_id: reported_user_id,
        razon,
        descripcion: descripcion || null,
        status: 'pending',
      });

      if (error) throw Object.assign(new Error('Error al crear reporte.'), { status: 500 });

      res.status(201).json({ mensaje: 'Reporte enviado. Nuestro equipo lo revisará. 🙏' });
    } catch (e) { next(e); }
  }
);

// POST /api/reports/block/:userId
// Bloquear usuario
router.post('/block/:userId', authenticateToken, async (req, res, next) => {
  try {
    const { userId: blockedId } = req.params;

    if (blockedId === req.user.id) {
      return res.status(400).json({ error: 'No puedes bloquearte a ti mismo.' });
    }

    await supabase.from('blocked_users').upsert({
      blocker_id: req.user.id,
      blocked_id: blockedId,
    });

    res.json({ mensaje: 'Usuario bloqueado.' });
  } catch (e) { next(e); }
});

// DELETE /api/reports/block/:userId
// Desbloquear usuario
router.delete('/block/:userId', authenticateToken, async (req, res, next) => {
  try {
    await supabase
      .from('blocked_users')
      .delete()
      .eq('blocker_id', req.user.id)
      .eq('blocked_id', req.params.userId);

    res.json({ mensaje: 'Usuario desbloqueado.' });
  } catch (e) { next(e); }
});

module.exports = router;

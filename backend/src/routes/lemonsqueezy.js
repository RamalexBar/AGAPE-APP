const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const supabase = require('../config/supabase');
const { authenticateToken } = require('../middlewares/auth');

// ─────────────────────────────────────────
// POST /api/lemonsqueezy/webhook
// ─────────────────────────────────────────
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    const hmac = crypto.createHmac('sha256', secret);
    const digest = Buffer.from(hmac.update(req.body).digest('hex'), 'utf8');
    const signature = Buffer.from(String(req.headers['x-signature'] || ''), 'utf8');

    if (digest.length !== signature.length || !crypto.timingSafeEqual(digest, signature)) {
      return res.status(401).json({ error: 'Firma inválida' });
    }

    const payload = JSON.parse(req.body);
    const eventName = payload.meta.event_name;
    const data = payload.data;
    const userId = payload.meta.custom_data?.user_id;

    console.log(`📦 LemonSqueezy evento: ${eventName} userId: ${userId}`);

    // La tabla `subscriptions` no tiene una restricción UNIQUE en user_id
    // (permite histórico de suscripciones), así que no se puede hacer
    // upsert con onConflict. En su lugar, buscamos la fila activa más
    // reciente del usuario y la actualizamos, o insertamos una nueva.
    const obtenerFilaActiva = async (uid) => {
      const { data: fila } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', uid)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      return fila;
    };

    switch (eventName) {
      case 'order_created':
      case 'subscription_created': {
        if (!userId) break;
        const periodEnd = data.attributes.ends_at || data.attributes.renews_at;

        // Desactivar cualquier suscripción activa previa del usuario
        await supabase.from('subscriptions')
          .update({ is_active: false })
          .eq('user_id', userId).eq('is_active', true);

        await supabase.from('subscriptions').insert({
          user_id:        userId,
          plan_type:      'premium',
          is_active:      true,
          started_at:     new Date().toISOString(),
          expires_at:     periodEnd,
          transaction_id: data.id.toString(),
        });
        console.log(`✅ Premium activado: ${userId}`);
        break;
      }

      case 'subscription_updated': {
        if (!userId) break;
        const activa = data.attributes.status === 'active';
        const fila = await obtenerFilaActiva(userId);
        if (fila) {
          await supabase.from('subscriptions').update({
            is_active:  activa,
            expires_at: data.attributes.renews_at,
          }).eq('id', fila.id);
        }
        break;
      }

      case 'subscription_cancelled':
      case 'subscription_expired': {
        if (!userId) break;
        await supabase.from('subscriptions')
          .update({ is_active: false })
          .eq('user_id', userId).eq('is_active', true);
        console.log(`❌ Suscripción cancelada: ${userId}`);
        break;
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error webhook LemonSqueezy:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ─────────────────────────────────────────
// GET /api/lemonsqueezy/subscription/:userId
// ─────────────────────────────────────────
router.get('/subscription/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'No autorizado.' });
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return res.json({ plan: 'free', status: 'none' });

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      await supabase.from('subscriptions')
        .update({ is_active: false })
        .eq('id', data.id);
      return res.json({ plan: 'free', status: 'expired' });
    }

    res.json({ plan: data.plan_type, status: data.is_active ? 'active' : 'inactive', expires_at: data.expires_at });
  } catch (error) {
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;
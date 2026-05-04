const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const supabase = require('../models/supabaseClient');

// ─────────────────────────────────────────
// POST /api/lemonsqueezy/webhook
// ─────────────────────────────────────────
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    const hmac = crypto.createHmac('sha256', secret);
    const digest = hmac.update(req.body).digest('hex');
    const signature = req.headers['x-signature'];

    if (digest !== signature) {
      return res.status(401).json({ error: 'Firma inválida' });
    }

    const payload = JSON.parse(req.body);
    const eventName = payload.meta.event_name;
    const data = payload.data;
    const userId = payload.meta.custom_data?.user_id;

    console.log(`📦 LemonSqueezy evento: ${eventName} userId: ${userId}`);

    switch (eventName) {
      case 'order_created':
      case 'subscription_created': {
        if (!userId) break;
        const periodEnd = data.attributes.ends_at || data.attributes.renews_at;
        await supabase.from('subscriptions').upsert({
          user_id: userId,
          plan: 'premium',
          status: 'active',
          stripe_subscription_id: data.id.toString(),
          current_period_end: periodEnd,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
        console.log(`✅ Premium activado: ${userId}`);
        break;
      }

      case 'subscription_updated': {
        if (!userId) break;
        const status = data.attributes.status === 'active' ? 'active' : 'canceling';
        await supabase.from('subscriptions').upsert({
          user_id: userId,
          status,
          current_period_end: data.attributes.renews_at,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
        break;
      }

      case 'subscription_cancelled':
      case 'subscription_expired': {
        if (!userId) break;
        await supabase.from('subscriptions').upsert({
          user_id: userId,
          plan: 'free',
          status: 'canceled',
          current_period_end: null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
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
router.get('/subscription/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) return res.json({ plan: 'free', status: 'none' });

    if (data.current_period_end && new Date(data.current_period_end) < new Date()) {
      await supabase.from('subscriptions')
        .update({ status: 'expired', plan: 'free' })
        .eq('user_id', userId);
      return res.json({ plan: 'free', status: 'expired' });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const supabase = require('../models/supabaseClient');

router.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-event-checksum'];
    const body = JSON.stringify(req.body);

    const secret = process.env.WOMPI_EVENTOS;
    const hash = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    if (hash !== signature) {
      return res.status(401).json({ error: 'Firma inválida' });
    }

    const { event, data } = req.body;

    if (event === 'transaction.updated') {
      const { reference, status } = data.transaction;

      if (status === 'APPROVED') {
        await supabase
          .from('payment_references')
          .update({ status: 'APPROVED' })
          .eq('referencia', reference);
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error webhook Wompi:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;
const router = require('express').Router();
const { handleAppleWebhook, handleGoogleWebhook } = require('../services/webhookService');
const logger = require('../config/logger');

/**
 * POST /api/webhooks/apple
 * Apple Server Notifications V2
 */
router.post('/apple', async (req, res) => {
  try {
    // Apple envía un JWS (JSON Web Signature) en el campo 'signedPayload'
    // Para producción real, se debe verificar la firma con el certificado de Apple
    const { signedPayload } = req.body;
    if (!signedPayload) return res.status(400).send('Falta signedPayload');

    // Decodificar payload (simplificado para este ejemplo)
    const parts = signedPayload.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

    await handleAppleWebhook(payload);
    res.status(200).send('OK');
  } catch (err) {
    logger.error({ err }, '[WEBHOOK APPLE] Error procesando notificación');
    res.status(500).send('Error');
  }
});

/**
 * POST /api/webhooks/google
 * Google Cloud Pub/Sub Push Notification
 */
router.post('/google', async (req, res) => {
  try {
    // Google envía un mensaje Pub/Sub
    if (!req.body.message) return res.status(400).send('Falta message');
    
    await handleGoogleWebhook(req.body);
    res.status(200).send('OK');
  } catch (err) {
    logger.error({ err }, '[WEBHOOK GOOGLE] Error procesando notificación');
    res.status(500).send('Error');
  }
});

module.exports = router;

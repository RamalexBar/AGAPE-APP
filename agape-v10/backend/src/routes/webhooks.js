const router = require('express').Router();
const { handleAppleWebhook, handleGoogleWebhook } = require('../services/webhookService');
const logger = require('../config/logger');
const env    = require('../config/env');

// Verificación por secreto compartido en query string (?token=...).
// Configura la URL de notificaciones en App Store Connect / Play Console como
// https://tu-dominio/api/webhooks/apple?token=WEBHOOK_SHARED_SECRET
// Esto NO reemplaza la verificación criptográfica de la firma JWS de Apple
// (recomendada para producción vía una librería dedicada como
// @apple/app-store-server-library), pero impide que cualquiera en internet
// pueda invocar estos endpoints sin conocer el secreto.
function verificarSecretoWebhook(req, res, next) {
  if (!env.WEBHOOK_SHARED_SECRET) {
    logger.warn('[WEBHOOK] WEBHOOK_SHARED_SECRET no configurado — endpoint sin protección.');
    return next();
  }
  if (req.query.token !== env.WEBHOOK_SHARED_SECRET) {
    return res.status(401).send('No autorizado');
  }
  next();
}

/**
 * POST /api/webhooks/apple
 * Apple Server Notifications V2
 */
router.post('/apple', verificarSecretoWebhook, async (req, res) => {
  try {
    // Apple envía un JWS (JSON Web Signature) en el campo 'signedPayload'.
    // TODO producción: verificar la firma con el certificado de Apple
    // (x5c chain hasta el Root CA de Apple) usando una librería dedicada.
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
router.post('/google', verificarSecretoWebhook, async (req, res) => {
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

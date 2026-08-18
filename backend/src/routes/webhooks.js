const router = require('express').Router();
const { OAuth2Client } = require('google-auth-library');
const { handleAppleWebhook, handleGoogleWebhook } = require('../services/webhookService');
const { getVerifier } = require('../config/appleIapVerifier');
const logger = require('../config/logger');

const oauthClient = new OAuth2Client();

/**
 * Google Cloud Pub/Sub firma cada push con un ID token OIDC (configurado en la
 * suscripción push con --push-auth-token-audience) en el header Authorization.
 * Sin esto, cualquiera puede simular un POST y forjar una notificación.
 * En desarrollo se omite (no hay infraestructura de Pub/Sub real que probar).
 */
const verificarPubSubToken = async (req) => {
  if (process.env.NODE_ENV !== 'production') {
    logger.warn('[WEBHOOK GOOGLE] Verificación de Pub/Sub omitida (NODE_ENV != production)');
    return;
  }

  const audience = process.env.GOOGLE_PUBSUB_AUDIENCE;
  if (!audience) throw new Error('Falta GOOGLE_PUBSUB_AUDIENCE en producción');

  const match = (req.headers.authorization || '').match(/^Bearer (.+)$/);
  if (!match) throw new Error('Falta el header Authorization Bearer de Pub/Sub');

  const ticket = await oauthClient.verifyIdToken({ idToken: match[1], audience });
  const claims = ticket.getPayload();

  const cuentaEsperada = process.env.GOOGLE_PUBSUB_SERVICE_ACCOUNT_EMAIL;
  if (cuentaEsperada && claims.email !== cuentaEsperada) {
    throw new Error(`Service account de Pub/Sub no autorizado: ${claims.email}`);
  }
};

/**
 * POST /api/webhooks/apple
 * Apple Server Notifications V2 — el signedPayload es un JWS firmado por Apple;
 * se verifica la cadena de certificados antes de confiar en el contenido.
 */
router.post('/apple', async (req, res) => {
  try {
    const { signedPayload } = req.body;
    if (!signedPayload) return res.status(400).send('Falta signedPayload');

    const payload = await getVerifier().verifyAndDecodeNotification(signedPayload);

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
    await verificarPubSubToken(req);
  } catch (err) {
    logger.error({ err }, '[WEBHOOK GOOGLE] Token de autenticación inválido');
    return res.status(401).send('No autorizado');
  }

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

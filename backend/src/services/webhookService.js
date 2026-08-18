const logger = require('../config/logger');
const supabase = require('../config/supabase');
const { getVerifier } = require('../config/appleIapVerifier');

/**
 * Maneja notificaciones de servidor de Apple (App Store Server Notifications V2)
 *
 * `payload` ya viene verificado (firma comprobada por getVerifier().verifyAndDecodeNotification).
 * El transactionId real NO está en el nivel superior: viene dentro de
 * data.signedTransactionInfo, otro JWS que hay que decodificar (y verificar) aparte.
 * https://developer.apple.com/documentation/appstoreservernotifications/data
 */
const handleAppleWebhook = async (payload) => {
  const { notificationType, data } = payload;
  if (!data?.signedTransactionInfo) {
    logger.debug({ notificationType }, '[WEBHOOK APPLE] Notificación sin signedTransactionInfo, ignorada');
    return;
  }

  const transaccion = await getVerifier().verifyAndDecodeTransaction(data.signedTransactionInfo);
  // originalTransactionId es estable durante toda la vida de la suscripción — es lo que
  // se guardó como transaction_id al procesar la compra inicial (ver iapService.procesarCompra).
  const { originalTransactionId, expiresDate } = transaccion;
  logger.info({ notificationType, originalTransactionId }, '[WEBHOOK APPLE] Recibido');

  if (!originalTransactionId) return;

  switch (notificationType) {
    case 'SUBSCRIBED':
    case 'DID_RENEW':
      await supabase.from('subscriptions')
        .update({
          is_active: true,
          expires_at: expiresDate ? new Date(expiresDate).toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('transaction_id', originalTransactionId);
      logger.info({ originalTransactionId }, '[WEBHOOK APPLE] Suscripción activada/renovada');
      break;
    case 'EXPIRED':
    case 'DID_FAIL_TO_RENEW':
    case 'REVOKE':
    case 'REFUND':
      await supabase.from('subscriptions')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('transaction_id', originalTransactionId);
      logger.info({ originalTransactionId, notificationType }, '[WEBHOOK APPLE] Suscripción desactivada');
      break;
    default:
      logger.debug({ notificationType }, '[WEBHOOK APPLE] Notificación no manejada');
  }
};

/**
 * Maneja notificaciones de servidor de Google (Real-time Developer Notifications)
 */
const handleGoogleWebhook = async (payload) => {
  // Google envía un mensaje Pub/Sub codificado en base64
  const dataStr = Buffer.from(payload.message.data, 'base64').toString();
  const data = JSON.parse(dataStr);

  logger.info({ data }, '[WEBHOOK GOOGLE] Recibido');

  if (data.subscriptionNotification) {
    const { notificationType, purchaseToken, subscriptionId } = data.subscriptionNotification;
    // Tipos: 2=RENEWED, 3=CANCELED, 13=EXPIRED, etc.
    if ([3, 13].includes(notificationType)) {
      await supabase.from('subscriptions')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('transaction_id', purchaseToken); // En Google el token suele usarse como ID único
      logger.info({ purchaseToken }, '[WEBHOOK GOOGLE] Suscripción desactivada');
    }
  }
};

module.exports = { handleAppleWebhook, handleGoogleWebhook };

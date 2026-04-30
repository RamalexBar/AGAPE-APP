const logger = require('../config/logger');
const supabase = require('../config/supabase');
const { activarSuscripcion } = require('./monetizationAgapeService');

/**
 * Maneja notificaciones de servidor de Apple (App Store Server Notifications V2)
 */
const handleAppleWebhook = async (payload) => {
  const { notificationType, data } = payload;
  logger.info({ notificationType, transactionId: data?.transactionId }, '[WEBHOOK APPLE] Recibido');

  switch (notificationType) {
    case 'SUBSCRIBED':
    case 'DID_RENEW':
      // Lógica para asegurar que la suscripción esté activa en DB
      break;
    case 'EXPIRED':
    case 'DID_FAIL_TO_RENEW':
    case 'REVOKE':
      // Desactivar suscripción en DB
      if (data?.transactionId) {
        await supabase.from('subscriptions')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('transaction_id', data.transactionId);
        logger.info({ transactionId: data.transactionId }, '[WEBHOOK APPLE] Suscripción desactivada');
      }
      break;
    case 'REFUND':
      // Manejar reembolso
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

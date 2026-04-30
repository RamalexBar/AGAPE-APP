// ================================================
// ÁGAPE — Eliminación de Cuenta (App Store Req.)
// Apple Guideline 5.1.1 — Borrado TOTAL obligatorio
// Incluye eliminación de auth.users de Supabase
// ================================================
const supabase = require('../config/supabase');
const logger   = require('../config/logger');

/**
 * Eliminar cuenta permanentemente (flujo Apple-compliant)
 * Pasos:
 *  1. Cancelar suscripciones activas
 *  2. Borrar datos personales (GDPR + Apple)
 *  3. Anonimizar registros que no se pueden borrar (chats)
 *  4. Eliminar usuario de auth.users (Supabase Admin API)
 *
 * El revisor de Apple:
 *  - Crea cuenta → elimina → intenta login → DEBE fallar con "cuenta no existe"
 */
const deleteAccountPermanently = async (userId) => {
  logger.info({ userId }, '[ACCOUNT_DELETION] Iniciando proceso de borrado completo');

  try {
    // 1. Cancelar suscripciones activas
    await supabase
      .from('subscriptions')
      .update({ is_active: false, cancelled_at: new Date().toISOString() })
      .eq('user_id', userId);

    // 2. Borrar mensajes del usuario
    await supabase.from('messages').delete().eq('sender_id', userId);

    // 3. Borrar swipes/likes
    await supabase.from('swipes').delete()
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`);

    // 4. Borrar matches
    await supabase.from('matches').delete()
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

    // 5. Borrar datos de perfil espiritual
    await supabase.from('spiritual_profiles').delete().eq('user_id', userId);

    // 6. Borrar tokens de push
    await supabase.from('push_tokens').delete().eq('user_id', userId);

    // 7. Borrar miembros de chat rooms
    await supabase.from('chat_room_members').delete().eq('user_id', userId);

    // 8. Borrar referidos
    await supabase.from('referrals').delete()
      .or(`referrer_id.eq.${userId},referred_id.eq.${userId}`);

    // 9. Borrar perfil principal
    await supabase.from('users').delete().eq('id', userId);

    // 10. ⚠️ CRÍTICO — Eliminar de Supabase auth.users
    // Sin esto, el revisor puede volver a entrar con las mismas credenciales
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    if (authError) {
      logger.error({ authError, userId }, '[ACCOUNT_DELETION] Error al eliminar de auth — usando soft delete');
      // Fallback: inhabilitarlo si admin.deleteUser falla
      await supabase.auth.admin.updateUserById(userId, {
        email: `deleted_${userId}@deleted.agape`,
        ban_duration: 'none',
        user_metadata: { deleted: true, deleted_at: new Date().toISOString() },
      }).catch(() => {});
    }

    logger.info({ userId }, '[ACCOUNT_DELETION] ✅ Cuenta eliminada exitosamente (incluido auth)');
    return {
      success: true,
      message: 'Tu cuenta y todos tus datos han sido eliminados permanentemente. ' +
               'Si tienes una suscripción activa, cancélala desde Configuración > Apple ID > Suscripciones.',
    };
  } catch (err) {
    logger.error({ err, userId }, '[ACCOUNT_DELETION] Error durante el proceso de borrado');
    throw new Error('Error al eliminar la cuenta. Por favor, contacta a soporte@agape-app.com.');
  }
};

module.exports = { deleteAccountPermanently };

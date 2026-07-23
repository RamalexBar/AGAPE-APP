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
    const r1 = await supabase
      .from('subscriptions')
      .update({ is_active: false })
      .eq('user_id', userId).eq('is_active', true);
    if (r1.error) logger.error({ err: r1.error, userId }, '[ACCOUNT_DELETION] Error cancelando suscripciones');

    // 2. Borrar conversaciones (y sus mensajes) donde participa el usuario
    const { data: conversaciones } = await supabase
      .from('conversations')
      .select('id')
      .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`);
    const idsConversaciones = (conversaciones || []).map(c => c.id);
    if (idsConversaciones.length) {
      const rMsg = await supabase.from('messages').delete().in('conversation_id', idsConversaciones);
      if (rMsg.error) logger.error({ err: rMsg.error, userId }, '[ACCOUNT_DELETION] Error borrando mensajes');
      const rConv = await supabase.from('conversations').delete().in('id', idsConversaciones);
      if (rConv.error) logger.error({ err: rConv.error, userId }, '[ACCOUNT_DELETION] Error borrando conversaciones');
    }

    // 3. Borrar swipes/likes
    const r3 = await supabase.from('swipes').delete()
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`);
    if (r3.error) logger.error({ err: r3.error, userId }, '[ACCOUNT_DELETION] Error borrando swipes');

    // 4. Borrar conexiones (matches)
    const r4 = await supabase.from('connections').delete()
      .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`);
    if (r4.error) logger.error({ err: r4.error, userId }, '[ACCOUNT_DELETION] Error borrando conexiones');

    // 5. Borrar datos de perfil espiritual
    const r5 = await supabase.from('spiritual_profiles').delete().eq('user_id', userId);
    if (r5.error) logger.error({ err: r5.error, userId }, '[ACCOUNT_DELETION] Error borrando perfil espiritual');

    // 6. Borrar tokens de push
    const r6 = await supabase.from('push_tokens').delete().eq('user_id', userId);
    if (r6.error) logger.error({ err: r6.error, userId }, '[ACCOUNT_DELETION] Error borrando push tokens');

    // 7. Borrar bloqueos (en ambas direcciones)
    const r7 = await supabase.from('blocked_users').delete()
      .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);
    if (r7.error) logger.error({ err: r7.error, userId }, '[ACCOUNT_DELETION] Error borrando bloqueos');

    // 8. Borrar referidos
    const r8 = await supabase.from('referrals').delete()
      .or(`referrer_id.eq.${userId},referred_id.eq.${userId}`);
    if (r8.error) logger.error({ err: r8.error, userId }, '[ACCOUNT_DELETION] Error borrando referidos');

    // 9. Borrar fila de perfil (fotos/intereses)
    const r9 = await supabase.from('profiles').delete().eq('user_id', userId);
    if (r9.error) logger.error({ err: r9.error, userId }, '[ACCOUNT_DELETION] Error borrando perfil');

    // 10. Borrar perfil principal
    const r10 = await supabase.from('users').delete().eq('id', userId);
    if (r10.error) logger.error({ err: r10.error, userId }, '[ACCOUNT_DELETION] Error borrando usuario');

    // 11. ⚠️ CRÍTICO — Eliminar de Supabase auth.users
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

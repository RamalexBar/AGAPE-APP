// ================================================
// ÁGAPE — Servicio de Notificaciones Push
// Firebase Cloud Messaging (FCM)
// ================================================
const supabase = require('../config/supabase');

// ── Inicializar Firebase (solo si las credenciales están configuradas) ──
let firebaseAdmin = null;

const initFirebase = () => {
  if (firebaseAdmin) return firebaseAdmin;

  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    console.warn('[Push] Firebase no configurado — las notificaciones push están desactivadas.');
    return null;
  }

  try {
    const admin = require('firebase-admin');
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId:   FIREBASE_PROJECT_ID,
          clientEmail: FIREBASE_CLIENT_EMAIL,
          privateKey:  FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
    }
    firebaseAdmin = admin;
    console.log('[Push] Firebase inicializado.');
    return admin;
  } catch (err) {
    console.error('[Push] Error al inicializar Firebase:', err.message);
    return null;
  }
};

// ── Obtener FCM tokens de un usuario ─────────────────────────────
const getTokens = async (userId) => {
  const { data } = await supabase
    .from('push_tokens')
    .select('token, plataforma')
    .eq('user_id', userId)
    .eq('activo', true);
  return (data || []).map(r => r.token);
};

// ── Enviar notificación push a un usuario ─────────────────────────
const sendToUser = async (userId, { titulo, cuerpo, datos = {} }) => {
  const admin = initFirebase();
  const tokens = await getTokens(userId);

  if (!tokens.length) return; // Sin tokens registrados → silencioso

  const mensaje = {
    notification: { title: titulo, body: cuerpo },
    data: Object.fromEntries(
      Object.entries(datos).map(([k, v]) => [k, String(v)])
    ),
    tokens,
  };

  if (!admin) {
    // Modo simulado: loggear en lugar de enviar
    console.log(`[Push SIM] → user:${userId} | ${titulo}: ${cuerpo}`);
    return;
  }

  try {
    const response = await admin.messaging().sendEachForMulticast(mensaje);
    // Limpiar tokens inválidos
    response.responses.forEach(async (res, idx) => {
      if (!res.success && res.error?.code === 'messaging/registration-token-not-registered') {
        await supabase
          .from('push_tokens')
          .update({ activo: false })
          .eq('token', tokens[idx]);
      }
    });
  } catch (err) {
    console.error('[Push] Error al enviar:', err.message);
  }
};

// ── Notificaciones específicas del dominio ────────────────────────

const notificarNuevoMatch = async (userId, { nombreOtro, avatarOtro, tipo }) => {
  const mensajes = {
    friendship: `¡Nueva conexión de fe con ${nombreOtro}! 🤝`,
    community:  `¡${nombreOtro} y tú comparten el mismo llamado! 🙌`,
    marriage:   `¡Nueva conexión especial con ${nombreOtro}! 💛`,
  };
  await sendToUser(userId, {
    titulo: '¡Nuevo Match en Ágape! ✝️',
    cuerpo: mensajes[tipo] || mensajes.friendship,
    datos:  { tipo: 'match', otro_usuario: nombreOtro },
  });
};

const notificarNuevoLike = async (userId, { nombreDe }) => {
  await sendToUser(userId, {
    titulo: 'Alguien está interesado en conocerte ❤️',
    cuerpo: 'Descubre quién quiere conectar contigo — puede ser especial',
    datos:  { tipo: 'like' },
  });
};

const notificarNuevoMensaje = async (userId, { nombreDe, preview }) => {
  const texto = preview?.length > 60 ? preview.slice(0, 60) + '…' : preview;
  await sendToUser(userId, {
    titulo: `Tienes un mensaje especial`,
    cuerpo: texto || `${nombreDe} te escribió algo`,
    datos:  { tipo: 'message' },
  });
};

const notificarSuperConexion = async (userId, { nombreDe }) => {
  await sendToUser(userId, {
    titulo: '⭐ Super Conexión recibida',
    cuerpo: `${nombreDe} te envió una super conexión`,
    datos:  { tipo: 'super_connect' },
  });
};

// ── Registrar/actualizar FCM token del usuario ────────────────────
const registrarToken = async (userId, token, plataforma = 'android') => {
  await supabase
    .from('push_tokens')
    .upsert(
      { user_id: userId, token, plataforma, activo: true, updated_at: new Date().toISOString() },
      { onConflict: 'token' }
    );
};

const eliminarToken = async (userId, token) => {
  await supabase
    .from('push_tokens')
    .update({ activo: false })
    .eq('user_id', userId)
    .eq('token', token);
};

module.exports = {
  sendToUser,
  notificarNuevoMatch,
  notificarNuevoLike,
  notificarNuevoMensaje,
  notificarSuperConexion,
  registrarToken,
  eliminarToken,
};

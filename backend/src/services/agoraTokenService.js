// src/services/agoraTokenService.js — genera tokens RTC firmados para
// videollamadas reales (Agora). Antes /api/videocall/* devolvía
// app_id/token/uid siempre null y el cliente caía a un "modo demo".
const { RtcTokenBuilder, RtcRole } = require('agora-token');

const APP_ID          = process.env.AGORA_APP_ID || null;
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE || null;

// Un poco más que el límite Premium (5 min) para dar margen de conexión.
const TOKEN_TTL_SEGUNDOS = 15 * 60;

const agoraConfigurado = () => !!(APP_ID && APP_CERTIFICATE);

// uid=0 en el token autoriza a cualquier UID que el motor de cada cliente
// decida usar al unirse (Agora se lo asigna automáticamente) — así ambos
// participantes de una llamada 1-a-1 pueden reutilizar el mismo token.
const generarCredenciales = (canal) => {
  if (!agoraConfigurado()) return { app_id: null, token: null, uid: 0 };

  const ahora     = Math.floor(Date.now() / 1000);
  const expiraEn  = ahora + TOKEN_TTL_SEGUNDOS;
  const token = RtcTokenBuilder.buildTokenWithUid(
    APP_ID, APP_CERTIFICATE, canal, 0, RtcRole.PUBLISHER, expiraEn, expiraEn
  );

  return { app_id: APP_ID, token, uid: 0 };
};

module.exports = { generarCredenciales, agoraConfigurado };

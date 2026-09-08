// Wrapper nativo de Agora. Metro resuelve automáticamente agoraNative.web.js
// en vez de este archivo al empaquetar para web — así "expo start --web"
// nunca intenta resolver react-native-agora (que importa internos de RN no
// soportados en web y rompe el bundle entero si se referencia ahí).
let createAgoraRtcEngine, RtcSurfaceView, ChannelProfileType, ClientRoleType;
try {
  const agora = require('react-native-agora');
  createAgoraRtcEngine = agora.createAgoraRtcEngine;
  RtcSurfaceView = agora.RtcSurfaceView;
  ChannelProfileType = agora.ChannelProfileType;
  ClientRoleType = agora.ClientRoleType;
} catch {
  // Módulo nativo no compilado (p. ej. Expo Go) — modo demo.
}

module.exports = { createAgoraRtcEngine, RtcSurfaceView, ChannelProfileType, ClientRoleType };

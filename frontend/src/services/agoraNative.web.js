// Variante web: react-native-agora no es compatible con web (importa
// internos nativos de React Native). Metro elige este archivo automáticamente
// al construir para web, así el módulo real nunca se referencia ahí.
module.exports = {
  createAgoraRtcEngine: undefined,
  RtcSurfaceView: undefined,
  ChannelProfileType: undefined,
  ClientRoleType: undefined,
};

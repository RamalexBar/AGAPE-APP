// ================================================
// ÁGAPE — Mensajes Emocionales
// Lenguaje que conecta, no que vende
// ================================================

const MENSAJES_MATCH = {
  friendship: [
    'Encontraste a alguien que comparte tu forma de ver la vida 🤝',
    'Una nueva amistad con propósito está comenzando ✨',
    'Hay algo especial en esta conexión de fe',
  ],
  community:  [
    'Caminan hacia el mismo propósito juntos 🙌',
    'El Señor tiene planes para esta conexión',
    'Dos corazones que buscan servir desde el mismo lugar',
  ],
  marriage:   [
    'Algo especial acaba de comenzar 💛',
    'Quizás esta es la persona que tanto pediste en oración',
    'Esta conexión merece ser cultivada con cuidado',
  ],
};

const MENSAJES_COMPATIBILIDAD = (score) => {
  if (score >= 90) return 'Comparten valores muy profundos — raramente se encuentra';
  if (score >= 80) return 'Tienen mucho en común en lo que más importa';
  if (score >= 70) return 'Comparten valores importantes para una relación sólida';
  if (score >= 60) return 'Sus caminos tienen puntos de encuentro significativos';
  return 'Hay cosas interesantes por descubrir juntos';
};

const MENSAJES_LIMITE_SWIPES = [
  'Por hoy has explorado muchas conexiones. Tómate un momento para profundizar en las que ya tienes 🙏',
  'Calidad sobre cantidad. Ya tienes conexiones esperando tu atención.',
  'Un buen momento para revisar tus matches existentes.',
];

const MENSAJES_NOTIFICACION = {
  like_recibido:    'Alguien está interesado en conocerte ❤️',
  nuevo_match:      'Hay alguien que comparte tus valores esperándote',
  vio_perfil:       'Alguien vio tu perfil hoy',
  oportunidades:    'Tienes nuevas oportunidades de conexión',
  inactividad:      'No estás aquí por casualidad. Hay personas esperando.',
  devocional:       'Tu momento de conexión espiritual te espera',
};

const PREGUNTAS_GUIADAS_CHAT = [
  '¿Qué papel juega Dios en tus decisiones importantes?',
  '¿Cómo imaginas una familia construida sobre la fe?',
  '¿Qué versículo ha marcado más tu vida hasta hoy?',
  '¿Cómo describes tu relación con la iglesia actualmente?',
  '¿Qué significa para ti el servicio cristiano?',
  '¿Qué valores son innegociables para ti en una relación?',
  '¿Cómo manejas los desacuerdos desde la fe?',
  '¿Qué sueños tienes que quisieras compartir con alguien?',
];

const getMensajeMatch = (tipo) => {
  const lista = MENSAJES_MATCH[tipo] || MENSAJES_MATCH.friendship;
  return lista[Math.floor(Math.random() * lista.length)];
};

const getMensajeLimite = () =>
  MENSAJES_LIMITE_SWIPES[Math.floor(Date.now() / 3600000) % MENSAJES_LIMITE_SWIPES.length];

const getPreguntaGuiada = () =>
  PREGUNTAS_GUIADAS_CHAT[Math.floor(Math.random() * PREGUNTAS_GUIADAS_CHAT.length)];

module.exports = {
  getMensajeMatch,
  MENSAJES_COMPATIBILIDAD,
  getMensajeLimite,
  MENSAJES_NOTIFICACION,
  getPreguntaGuiada,
  PREGUNTAS_GUIADAS_CHAT,
};

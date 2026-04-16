// ================================================
// ÁGAPE v10 — Constantes globales
// ================================================

export const COLORES = {
  // Fondos
  fondo:       '#0a0a14',
  fondoCard:   '#141422',
  fondoInput:  'rgba(255,255,255,0.06)',

  // Primarios
  primario:    '#FF5C8D',
  secundario:  '#B44DFF',
  acento:      '#00C9FF',

  // Gradientes
  gradPrimario:   ['#FF5C8D', '#B44DFF'],
  gradSecundario: ['#B44DFF', '#5C6DFF'],
  gradFondo:      ['#0a0a14', '#15052a'],

  // Estados
  like:      '#FF5C8D',
  nope:      '#FF5555',
  superlike: '#00C9FF',
  boost:     '#FFD700',
  verde:     '#4ade80',

  // Texto
  texto:     '#FFFFFF',
  muted:     'rgba(255,255,255,0.5)',
  tenue:     'rgba(255,255,255,0.25)',

  // Bordes
  borde:     'rgba(255,255,255,0.10)',
  bordeCard: 'rgba(255,255,255,0.08)',
};

export const FUENTES = {
  regular:  { fontFamily: 'System' },
  bold:     { fontFamily: 'System', fontWeight: '700' },
  extrabold:{ fontFamily: 'System', fontWeight: '900' },
};

export const RADIOS = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  full: 999,
};

export const SOMBRAS = {
  suave: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  media: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
  },
  fuerte: {
    shadowColor: '#B44DFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 14,
  },
};

export const PLANES = [
  {
    id: 'mensual',
    nombre: '1 Mes',
    precio: '$14.900',
    precioUSD: 'USD $3.99',
    periodo: 'mes',
    productId: {
      android: 'agape_premium_monthly',
      ios: 'com.agape.app.premium.monthly',
    },
  },
  {
    id: 'trimestral',
    nombre: '3 Meses',
    precio: '$34.900',
    precioUSD: 'USD $9.99',
    periodo: '3 meses',
    popular: true,
    ahorro: 'Ahorra 22%',
    productId: {
      android: 'agape_premium_quarterly',
      ios: 'com.agape.app.premium.quarterly',
    },
  },
  {
    id: 'anual',
    nombre: '12 Meses',
    precio: '$119.900',
    precioUSD: 'USD $29.99',
    periodo: 'año',
    ahorro: 'Ahorra 33%',
    productId: {
      android: 'agape_premium_yearly',
      ios: 'com.agape.app.premium.yearly',
    },
  },
];

export const BENEFICIOS_PREMIUM = [
  { icono: 'infinite',        texto: 'Swipes ilimitados' },
  { icono: 'eye',             texto: 'Ver quién te dio like' },
  { icono: 'options',         texto: 'Filtros espirituales avanzados' },
  { icono: 'flash',           texto: '5 Super-Conexiones por día' },
  { icono: 'arrow-undo',      texto: 'Rewind — deshacer último pass' },
  { icono: 'ban',             texto: 'Sin anuncios' },
  { icono: 'checkmark-circle',texto: 'Badge verificado en perfil' },
  { icono: 'analytics',       texto: 'Compatibilidad espiritual detallada' },
  { icono: 'location',        texto: 'Cambiar ubicación manualmente' },
  { icono: 'mail',            texto: 'Mensajes sin límite de caracteres' },
];

export const INTERESES_LISTA = [
  '🎵 Música cristiana', '📚 Biblia & Teología', '🏋️ Gym', '🎮 Videojuegos',
  '🍕 Gastronomía', '✈️ Misiones', '🎨 Arte', '🐶 Mascotas',
  '🏔 Naturaleza', '🏖 Playa', '☕ Café', '💃 Alabanza',
  '🎬 Cine', '📸 Fotografía', '🏃 Deporte', '🌿 Medio Ambiente',
  '🚴 Ciclismo', '🧘 Retiros', '🎭 Teatro', '📖 Lectura',
];

export const LIKES_FREE = 20;
export const LIKES_INTERVALO_HORAS = 12;

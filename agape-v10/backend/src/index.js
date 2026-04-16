// ================================================
// ÁGAPE Backend v10 — Production Ready
// Node.js + Express + Socket.io + Supabase
// ================================================
require('dotenv').config();
require('express-async-errors');

const express      = require('express');
const http         = require('http');
const cors         = require('cors');
const compression  = require('compression');
const cookieParser = require('cookie-parser');
const morgan       = require('morgan');

const env          = require('./config/env');
const logger       = require('./config/logger');
const errorHandler = require('./middlewares/errorHandler');
const {
  securityHeaders, limitPayloadSize,
  sanitizeMiddleware, validateSQLInjection, limiters,
} = require('./middlewares/security');
const { trackActivity } = require('./middlewares/activity');

const app    = express();
const server = http.createServer(app);

// ── Seguridad & Middleware ──────────────────────────────────────────
app.use(securityHeaders);
app.use(compression());
app.use(limitPayloadSize);
app.use(cookieParser());

if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// CORS
app.use(cors({
  origin: (origin, callback) => {
    const allowed = [env.FRONTEND_URL, 'exp://localhost:8081', 'http://localhost:3000'];
    if (!origin || allowed.includes(origin) || env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Rate limiters
app.use('/api/auth/login',           limiters.auth);
app.use('/api/auth/register',        limiters.auth);
app.use('/api/auth/forgot-password', limiters.auth);
app.use('/api/matches/swipe',        limiters.swipe);
app.use('/api/chat',                 limiters.chat);
app.use('/api/reports',              limiters.reports);
app.use('/api/',                     limiters.api);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(sanitizeMiddleware);
app.use(validateSQLInjection);

// JWT decode sin bloquear (para trackActivity)
app.use((req, _res, next) => {
  const auth = req.headers['authorization'];
  if (auth?.startsWith('Bearer ')) {
    try {
      const jwt = require('jsonwebtoken');
      const p   = jwt.verify(auth.slice(7), env.JWT_ACCESS_SECRET);
      req.user  = { id: p.sub, email: p.email, role: p.role };
    } catch {}
  }
  next();
});
app.use(trackActivity);

// ── Rutas ───────────────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/profiles',      require('./routes/profiles'));
app.use('/api/matches',       require('./routes/matches'));
app.use('/api',               require('./routes/interactions'));
app.use('/api/chat',          require('./routes/chat'));
app.use('/api/reports',       require('./routes/reports'));
app.use('/api/spiritual',     require('./routes/spiritual'));
app.use('/api/referrals',     require('./routes/referrals'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/legal',         require('./routes/legal'));
app.use('/api/admin',         require('./routes/admin'));
app.use('/api/interests',     require('./routes/interests'));
app.use('/api/webhooks',      require('./routes/webhooks'));

// Legales públicos (App Store exige URLs sin auth)
app.get('/privacy', (req, res) => res.redirect(env.PRIVACY_POLICY_URL));
app.get('/terms',   (req, res) => res.redirect(env.TERMS_OF_SERVICE_URL));

// Health check
app.get('/health', (_req, res) => res.json({
  status: 'OK',
  app: 'ÁGAPE Backend v10',
  version: '10.0.0',
  env: env.NODE_ENV,
  timestamp: new Date().toISOString(),
}));

// 404
app.use('*', (_req, res) => res.status(404).json({
  success: false,
  error: { code: 'NOT_FOUND', message: 'Ruta no encontrada.' },
}));

// Error global
app.use(errorHandler);

// Socket.io
require('./socket/socketHandler')(server);

const PORT = env.PORT || 3000;
server.listen(PORT, () => {
  logger.info(`\n  ✝️  ÁGAPE Backend v10 — ${env.NODE_ENV}`);
  logger.info(`  → http://localhost:${PORT}`);
  logger.info(`  → Supabase + Socket.io + IAP listo\n`);
});

module.exports = { app, server };

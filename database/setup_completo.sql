-- ================================================
-- ÁGAPE v10 — Setup Completo de Base de Datos
-- UN SOLO ARCHIVO — pega y ejecuta todo de una vez
-- Reemplaza todos los archivos SQL individuales
-- ================================================

-- ── EXTENSIONES ───────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── FUNCIÓN updated_at (va primero, la usan los triggers) ─────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── USUARIOS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre                VARCHAR(60)  NOT NULL,
  email                 VARCHAR(255) NOT NULL UNIQUE,
  password_hash         TEXT         NOT NULL,
  genero                VARCHAR(10)  CHECK (genero IN ('M','F','otro')),
  fecha_nacimiento      DATE,
  edad                  INT,
  avatar_url            TEXT,
  bio                   VARCHAR(500),
  ubicacion_ciudad      VARCHAR(100),
  ubicacion_lat         DOUBLE PRECISION,
  ubicacion_lon         DOUBLE PRECISION,
  modo_invisible        BOOLEAN      DEFAULT FALSE,
  denomination          VARCHAR(80)  DEFAULT 'christian',
  connection_purpose    VARCHAR(20)  DEFAULT 'friendship'
                          CHECK (connection_purpose IN ('friendship','community','marriage')),
  intencion_relacion    VARCHAR(30)  DEFAULT 'amistad'
                          CHECK (intencion_relacion IN ('amistad','noviazgo_cristiano','matrimonio')),
  nivel_compromiso      VARCHAR(20)  DEFAULT 'serio'
                          CHECK (nivel_compromiso IN ('casual','serio','muy_serio')),
  frecuencia_iglesia    VARCHAR(20)  DEFAULT 'semanal'
                          CHECK (frecuencia_iglesia IN ('nunca','mensual','semanal','diaria')),
  valores               TEXT[]       DEFAULT '{}',
  spiritual_habits      JSONB        DEFAULT '{}',
  role                  VARCHAR(20)  DEFAULT 'user' CHECK (role IN ('user','admin','moderator')),
  is_active             BOOLEAN      DEFAULT TRUE,
  is_verified           BOOLEAN      DEFAULT FALSE,
  is_faith_verified     BOOLEAN      DEFAULT FALSE,
  is_banned             BOOLEAN      DEFAULT FALSE,
  ban_reason            TEXT,
  suspended_until       TIMESTAMPTZ,
  subscription_platform VARCHAR(10),
  nivel                 INT          DEFAULT 1,
  ultima_actividad      TIMESTAMPTZ  DEFAULT NOW(),
  last_active_at        TIMESTAMPTZ  DEFAULT NOW(),
  created_at            TIMESTAMPTZ  DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email        ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active       ON users(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_nivel        ON users(nivel);
CREATE INDEX IF NOT EXISTS idx_users_purpose      ON users(connection_purpose);
CREATE INDEX IF NOT EXISTS idx_users_denomination ON users(denomination);
CREATE INDEX IF NOT EXISTS idx_users_last_active  ON users(last_active_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_active_recent ON users(last_active_at DESC) WHERE is_active = TRUE AND is_banned = FALSE;

CREATE OR REPLACE FUNCTION calcular_edad()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.fecha_nacimiento IS NOT NULL THEN
    NEW.edad := DATE_PART('year', AGE(NEW.fecha_nacimiento))::INT;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calcular_edad ON users;
CREATE TRIGGER trg_calcular_edad
  BEFORE INSERT OR UPDATE OF fecha_nacimiento ON users
  FOR EACH ROW EXECUTE FUNCTION calcular_edad();

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── PERFILES ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  fotos      TEXT[]  DEFAULT '{}',
  intereses  TEXT[]  DEFAULT '{}',
  nombre     VARCHAR(60),
  edad       INT,
  ciudad     VARCHAR(100),
  bio        VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_user ON profiles(user_id);

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── SWIPES ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS swipes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action          VARCHAR(20) NOT NULL CHECK (action IN ('connect','pass','super_connect','like','dislike','superlike')),
  connection_type VARCHAR(20) DEFAULT 'friendship',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_user_id, to_user_id)
);

CREATE INDEX IF NOT EXISTS idx_swipes_from   ON swipes(from_user_id);
CREATE INDEX IF NOT EXISTS idx_swipes_to     ON swipes(to_user_id);
CREATE INDEX IF NOT EXISTS idx_swipes_action ON swipes(action);
CREATE INDEX IF NOT EXISTS idx_swipes_interest_lookup ON swipes(to_user_id, action, created_at DESC);

-- ── CONEXIONES (matches) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS connections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id_1       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_id_2       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status          VARCHAR(20) DEFAULT 'connected' CHECK (status IN ('connected','disconnected')),
  connection_type VARCHAR(20) DEFAULT 'friendship',
  initiated_by    UUID REFERENCES users(id),
  ultimo_mensaje  TEXT,
  connected_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id_1, user_id_2)
);

CREATE INDEX IF NOT EXISTS idx_connections_u1     ON connections(user_id_1);
CREATE INDEX IF NOT EXISTS idx_connections_u2     ON connections(user_id_2);
CREATE INDEX IF NOT EXISTS idx_connections_status ON connections(status);

DROP TRIGGER IF EXISTS trg_connections_updated_at ON connections;
CREATE TRIGGER trg_connections_updated_at
  BEFORE UPDATE ON connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── CONVERSACIONES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id_1       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_id_2       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id_1, user_id_2)
);

CREATE INDEX IF NOT EXISTS idx_conversations_u1       ON conversations(user_id_1);
CREATE INDEX IF NOT EXISTS idx_conversations_u2       ON conversations(user_id_2);
CREATE INDEX IF NOT EXISTS idx_conversations_last_msg ON conversations(last_message_at DESC);

-- ── MENSAJES ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content         TEXT,
  contenido       TEXT,
  tipo            VARCHAR(20) DEFAULT 'text' CHECK (tipo IN ('text','image','audio','verse')),
  media_url       TEXT,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conv    ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender  ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);

-- ── VERSÍCULOS DIARIOS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_verses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verse_text      TEXT         NOT NULL,
  verse_reference VARCHAR(100) NOT NULL,
  tema            VARCHAR(50),
  reflection      TEXT,
  prayer          TEXT,
  date_featured   DATE UNIQUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_verses_date ON daily_verses(date_featured);

-- ── REPORTES ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  razon           VARCHAR(80) NOT NULL,
  descripcion     TEXT,
  status          VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','reviewed','resolved','dismissed')),
  resolved_by     UUID REFERENCES users(id),
  resolved_at     TIMESTAMPTZ,
  nota_moderador  TEXT,
  accion_tomada   VARCHAR(20) CHECK (accion_tomada IN ('dismiss','warn','suspend','ban')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported ON reports(reported_id);
CREATE INDEX IF NOT EXISTS idx_reports_status   ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_pending  ON reports(status, created_at) WHERE status = 'pending';

-- ── USUARIOS BLOQUEADOS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blocked_users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_blocked_blocker ON blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_blocked ON blocked_users(blocked_id);

-- ── PERFIL ESPIRITUAL ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS spiritual_profiles (
  id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                      UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  total_xp                     INT  DEFAULT 0,
  nivel                        INT  DEFAULT 1,
  racha_devocional             INT  DEFAULT 0,
  max_racha_devocional         INT  DEFAULT 0,
  ultimo_devocional            DATE,
  total_devocionales           INT  DEFAULT 0,
  total_retos_completados      INT  DEFAULT 0,
  total_oraciones_compartidas  INT  DEFAULT 0,
  total_oraciones_intercedidas INT  DEFAULT 0,
  monedas_fe                   INT  DEFAULT 100,
  created_at                   TIMESTAMPTZ DEFAULT NOW(),
  updated_at                   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sp_user  ON spiritual_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_sp_xp    ON spiritual_profiles(total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_sp_nivel ON spiritual_profiles(nivel);
CREATE INDEX IF NOT EXISTS idx_sp_racha ON spiritual_profiles(racha_devocional DESC);

DROP TRIGGER IF EXISTS trg_spiritual_profiles_updated_at ON spiritual_profiles;
CREATE TRIGGER trg_spiritual_profiles_updated_at
  BEFORE UPDATE ON spiritual_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── SUSCRIPCIONES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_type      VARCHAR(20) NOT NULL DEFAULT 'free'
                   CHECK (plan_type IN ('free','premium','vip')),
  status         VARCHAR(20) DEFAULT 'inactive' CHECK (status IN ('active','inactive','cancelled','expired')),
  is_active      BOOLEAN DEFAULT FALSE,
  started_at     TIMESTAMPTZ DEFAULT NOW(),
  expires_at     TIMESTAMPTZ,
  transaction_id VARCHAR(255),
  precio_pagado  INT DEFAULT 0,
  plataforma     VARCHAR(30) CHECK (plataforma IN ('stripe','apple','google')),
  product_id     VARCHAR(255),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subs_user    ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subs_active  ON subscriptions(is_active);
CREATE INDEX IF NOT EXISTS idx_subs_expires ON subscriptions(expires_at);

DROP TRIGGER IF EXISTS trg_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── PUSH TOKENS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL,
  plataforma VARCHAR(20) CHECK (plataforma IN ('ios','android')),
  activo     BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, token)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user   ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_activo ON push_tokens(activo);

-- ── CONTADORES DE SWIPE ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_swipe_counters (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  swipe_date        DATE NOT NULL,
  daily_swipe_count INT  NOT NULL DEFAULT 0,
  ad_bonus_used     INT  NOT NULL DEFAULT 0 CHECK (ad_bonus_used >= 0 AND ad_bonus_used <= 2),
  referral_bonus    INT  DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, swipe_date)
);

CREATE INDEX IF NOT EXISTS idx_swipe_counters_user ON user_swipe_counters(user_id);
CREATE INDEX IF NOT EXISTS idx_swipe_counters_date ON user_swipe_counters(swipe_date);

DROP TRIGGER IF EXISTS trg_swipe_counters_updated_at ON user_swipe_counters;
CREATE TRIGGER trg_swipe_counters_updated_at
  BEFORE UPDATE ON user_swipe_counters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── MONETIZACIÓN ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS monetization_events (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  evento     VARCHAR(80) NOT NULL,
  plan_id    VARCHAR(20),
  valor_cop  INT         DEFAULT 0,
  metadata   JSONB       DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mon_events_user    ON monetization_events(user_id);
CREATE INDEX IF NOT EXISTS idx_mon_events_evento  ON monetization_events(evento);
CREATE INDEX IF NOT EXISTS idx_mon_events_created ON monetization_events(created_at DESC);

CREATE TABLE IF NOT EXISTS coins_history (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tipo       VARCHAR(20) NOT NULL CHECK (tipo IN ('ganado','gastado','bonus','referido')),
  cantidad   INT         NOT NULL,
  motivo     VARCHAR(100),
  saldo_post INT         NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coins_history_user ON coins_history(user_id);
CREATE INDEX IF NOT EXISTS idx_coins_history_date ON coins_history(created_at DESC);

CREATE TABLE IF NOT EXISTS profile_boosts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activo_desde TIMESTAMPTZ DEFAULT NOW(),
  activo_hasta TIMESTAMPTZ NOT NULL,
  origen       VARCHAR(20) DEFAULT 'coins' CHECK (origen IN ('coins','vip','admin'))
);

CREATE INDEX IF NOT EXISTS idx_boosts_user   ON profile_boosts(user_id);
CREATE INDEX IF NOT EXISTS idx_boosts_activo ON profile_boosts(activo_hasta);

-- ── LEGAL ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS legal_consents (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  terms_version   VARCHAR(10) NOT NULL,
  privacy_version VARCHAR(10) NOT NULL,
  accepted_at     TIMESTAMPTZ DEFAULT NOW(),
  ip_address      INET,
  user_agent      TEXT
);

CREATE INDEX IF NOT EXISTS idx_legal_consents_user ON legal_consents(user_id);

CREATE TABLE IF NOT EXISTS password_resets (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  expira_at  TIMESTAMPTZ NOT NULL,
  usado      BOOLEAN     DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_resets_user  ON password_resets(user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token_hash);

CREATE TABLE IF NOT EXISTS user_warnings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reporte_id UUID REFERENCES reports(id),
  motivo     TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_warnings_user ON user_warnings(user_id);

-- ── REFERIDOS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referral_codes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  codigo     VARCHAR(12) NOT NULL UNIQUE,
  usos       INT         DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_codigo ON referral_codes(codigo);
CREATE INDEX IF NOT EXISTS idx_referral_codes_user   ON referral_codes(user_id);

CREATE TABLE IF NOT EXISTS referral_uses (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id UUID NOT NULL REFERENCES referral_codes(id) ON DELETE CASCADE,
  referrer_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referred_user_id)
);

CREATE INDEX IF NOT EXISTS idx_referral_uses_referrer ON referral_uses(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_uses_referred ON referral_uses(referred_user_id);

-- ── HISTORIAL XP + BADGES ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS xp_history (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  xp_ganado        INT  NOT NULL,
  motivo           VARCHAR(255),
  total_xp_despues INT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xp_history_user    ON xp_history(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_history_created ON xp_history(created_at DESC);

CREATE TABLE IF NOT EXISTS user_spiritual_badges (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id    VARCHAR(100) NOT NULL,
  obtained_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_badges_user ON user_spiritual_badges(user_id);

CREATE TABLE IF NOT EXISTS devotional_completions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  versiculo_id   UUID REFERENCES daily_verses(id),
  date_completed DATE NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date_completed)
);

CREATE INDEX IF NOT EXISTS idx_dev_completions_user ON devotional_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_dev_completions_date ON devotional_completions(date_completed);

CREATE TABLE IF NOT EXISTS mission_completions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mission_id   VARCHAR(100) NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mission_comp_user ON mission_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_mission_comp_date ON mission_completions(completed_at DESC);

-- ── NOTIFICACIONES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tipo       VARCHAR(30) NOT NULL CHECK (tipo IN ('match','like','message','super_connect','referral','system')),
  titulo     VARCHAR(120),
  cuerpo     TEXT,
  datos      JSONB       DEFAULT '{}',
  leida      BOOLEAN     DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user    ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_leida   ON notifications(user_id, leida) WHERE leida = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- ── ANALYTICS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profile_views (
  id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_id UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_id UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(viewer_id, target_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_views_target ON profile_views(target_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_viewed ON profile_views(viewed_at DESC);

CREATE TABLE IF NOT EXISTS paywall_events (
  id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tipo     VARCHAR(50) NOT NULL,
  visto_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_paywall_events_user ON paywall_events(user_id);
CREATE INDEX IF NOT EXISTS idx_paywall_events_tipo ON paywall_events(tipo, visto_at DESC);

-- ── FUNCIONES RPC ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_daily_swipe(p_user_id UUID)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO user_swipe_counters (user_id, swipe_date, daily_swipe_count, ad_bonus_used, referral_bonus)
  VALUES (p_user_id, CURRENT_DATE, 1, 0, 0)
  ON CONFLICT (user_id, swipe_date)
  DO UPDATE SET
    daily_swipe_count = user_swipe_counters.daily_swipe_count + 1,
    updated_at        = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION increment_monedas_fe(p_user_id UUID, p_cantidad INT)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE spiritual_profiles
  SET monedas_fe = monedas_fe + p_cantidad, updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION decrement_monedas_fe(p_user_id UUID, p_cantidad INT)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE v_saldo INT;
BEGIN
  SELECT monedas_fe INTO v_saldo FROM spiritual_profiles WHERE user_id = p_user_id;
  IF v_saldo < p_cantidad THEN
    RAISE EXCEPTION 'Monedas insuficientes (saldo: %, requerido: %)', v_saldo, p_cantidad;
  END IF;
  UPDATE spiritual_profiles
  SET monedas_fe = monedas_fe - p_cantidad, updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION user_can_access(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE v_user RECORD;
BEGIN
  SELECT is_active, is_banned, suspended_until INTO v_user FROM users WHERE id = p_user_id;
  IF NOT FOUND THEN RETURN FALSE; END IF;
  IF NOT v_user.is_active THEN RETURN FALSE; END IF;
  IF v_user.is_banned THEN RETURN FALSE; END IF;
  IF v_user.suspended_until IS NOT NULL AND v_user.suspended_until > NOW() THEN RETURN FALSE; END IF;
  RETURN TRUE;
END;
$$;

-- ── VISTAS ────────────────────────────────────────────────────────
DROP VIEW IF EXISTS v_swipe_status_hoy;
CREATE VIEW v_swipe_status_hoy AS
SELECT
  u.id                                                       AS user_id,
  u.nombre,
  COALESCE(sc.daily_swipe_count, 0)                         AS swipes_usados,
  COALESCE(sc.ad_bonus_used,    0)                          AS anuncios_usados,
  COALESCE(sc.referral_bonus,   0)                          AS bonus_referido,
  20 + COALESCE(sc.ad_bonus_used,0)*6
     + COALESCE(sc.referral_bonus,0)                        AS limite_total,
  GREATEST(0,
    20 + COALESCE(sc.ad_bonus_used,0)*6
       + COALESCE(sc.referral_bonus,0)
       - COALESCE(sc.daily_swipe_count,0)
  )                                                          AS swipes_restantes,
  GREATEST(0, 2 - COALESCE(sc.ad_bonus_used,0))             AS anuncios_restantes
FROM users u
LEFT JOIN user_swipe_counters sc
  ON sc.user_id = u.id AND sc.swipe_date = CURRENT_DATE
WHERE u.is_active = TRUE;

DROP VIEW IF EXISTS v_usuarios_online;
CREATE VIEW v_usuarios_online AS
SELECT id, nombre, avatar_url, last_active_at,
  EXTRACT(EPOCH FROM (NOW() - last_active_at)) AS segundos_inactivo
FROM users
WHERE is_active = TRUE AND last_active_at > NOW() - INTERVAL '5 minutes'
ORDER BY last_active_at DESC;

DROP VIEW IF EXISTS v_premium_activos;
CREATE VIEW v_premium_activos AS
SELECT u.id, u.nombre, u.email, s.plan_type, s.expires_at, s.plataforma,
  EXTRACT(DAY FROM s.expires_at - NOW())::INT AS dias_restantes
FROM users u
JOIN subscriptions s ON s.user_id = u.id
WHERE s.is_active = TRUE AND s.plan_type != 'free'
  AND (s.expires_at IS NULL OR s.expires_at > NOW())
ORDER BY s.created_at DESC;

DROP VIEW IF EXISTS v_revenue_mensual;
CREATE VIEW v_revenue_mensual AS
SELECT
  DATE_TRUNC('month', created_at)::DATE AS mes,
  COUNT(*)                               AS transacciones,
  SUM(valor_cop)                         AS total_cop,
  COUNT(*) FILTER (WHERE evento='subscription_activated') AS suscripciones,
  COUNT(*) FILTER (WHERE evento='coins_purchased')        AS compras_monedas
FROM monetization_events
WHERE valor_cop > 0
GROUP BY 1 ORDER BY 1 DESC;

DROP VIEW IF EXISTS v_usuarios_suspendidos;
CREATE VIEW v_usuarios_suspendidos AS
SELECT id, nombre, email, suspended_until, ban_reason
FROM users
WHERE (suspended_until IS NOT NULL AND suspended_until > NOW()) OR is_banned = TRUE
ORDER BY is_banned DESC, suspended_until DESC;

DROP VIEW IF EXISTS v_paywall_conversion;
CREATE VIEW v_paywall_conversion AS
SELECT
  pe.tipo,
  COUNT(pe.id)                AS veces_mostrado,
  COUNT(DISTINCT pe.user_id)  AS usuarios_unicos,
  COUNT(DISTINCT me.user_id)  AS convirtieron,
  ROUND(100.0 * COUNT(DISTINCT me.user_id) / NULLIF(COUNT(DISTINCT pe.user_id),0), 1) AS conversion_pct
FROM paywall_events pe
LEFT JOIN monetization_events me
  ON me.user_id = pe.user_id
  AND me.evento = 'subscription_activated'
  AND me.created_at >= pe.visto_at
  AND me.created_at <= pe.visto_at + INTERVAL '24 hours'
GROUP BY pe.tipo
ORDER BY conversion_pct DESC NULLS LAST;

-- ✅ Setup completo de ÁGAPE v10

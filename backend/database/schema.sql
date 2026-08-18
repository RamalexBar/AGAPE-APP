-- ================================================
-- ÁGAPE — Schema Base Completo v2.0
-- Ejecutar en Supabase SQL Editor
-- Orden: este archivo primero, luego schema-spiritual-v2.sql
-- ================================================

-- ── EXTENSIONES ───────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================================
-- TABLAS BASE (v1)
-- ================================================

-- ── USUARIOS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre            VARCHAR(60)  NOT NULL,
  email             VARCHAR(255) NOT NULL UNIQUE,
  password_hash     TEXT         NOT NULL,
  genero            VARCHAR(10)  CHECK (genero IN ('M','F','otro')),
  fecha_nacimiento  DATE,
  edad              INT GENERATED ALWAYS AS (
                      DATE_PART('year', AGE(fecha_nacimiento))::INT
                    ) STORED,

  -- Perfil público
  avatar_url        TEXT,
  bio               VARCHAR(500),
  ubicacion_ciudad  VARCHAR(100),
  ubicacion_lat     DOUBLE PRECISION,
  ubicacion_lon     DOUBLE PRECISION,

  -- Fe y propósito
  denomination      VARCHAR(80)  DEFAULT 'christian',
  connection_purpose VARCHAR(20) DEFAULT 'friendship'
                      CHECK (connection_purpose IN ('friendship','community','marriage')),
  valores           TEXT[]       DEFAULT '{}',
  spiritual_habits  JSONB        DEFAULT '{}',

  -- Estado
  role              VARCHAR(20)  DEFAULT 'user' CHECK (role IN ('user','admin','moderator')),
  is_active         BOOLEAN      DEFAULT TRUE,
  is_verified       BOOLEAN      DEFAULT FALSE,
  is_faith_verified BOOLEAN      DEFAULT FALSE,
  is_banned         BOOLEAN      DEFAULT FALSE,
  ban_reason        TEXT,

  -- Nivel (desnormalizado para queries rápidas de matching)
  nivel             INT          DEFAULT 1,

  last_active_at    TIMESTAMPTZ  DEFAULT NOW(),
  created_at        TIMESTAMPTZ  DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX idx_users_email       ON users(email);
CREATE INDEX idx_users_active      ON users(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_users_nivel       ON users(nivel);
CREATE INDEX idx_users_purpose     ON users(connection_purpose);
CREATE INDEX idx_users_denomination ON users(denomination);
CREATE INDEX idx_users_last_active ON users(last_active_at DESC);

-- ── PERFILES (fotos + intereses) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  fotos      TEXT[]  DEFAULT '{}',
  intereses  TEXT[]  DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_user ON profiles(user_id);

-- ── SWIPES ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS swipes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action          VARCHAR(20) NOT NULL CHECK (action IN ('connect','pass','super_connect')),
  connection_type VARCHAR(20) DEFAULT 'friendship',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_user_id, to_user_id)
);

CREATE INDEX idx_swipes_from   ON swipes(from_user_id);
CREATE INDEX idx_swipes_to     ON swipes(to_user_id);
CREATE INDEX idx_swipes_action ON swipes(action);

-- ── CONEXIONES (matches) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS connections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id_1       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_id_2       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status          VARCHAR(20) DEFAULT 'connected' CHECK (status IN ('connected','disconnected')),
  connection_type VARCHAR(20) DEFAULT 'friendship',
  initiated_by    UUID REFERENCES users(id),
  connected_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id_1, user_id_2)
);

CREATE INDEX idx_connections_u1     ON connections(user_id_1);
CREATE INDEX idx_connections_u2     ON connections(user_id_2);
CREATE INDEX idx_connections_status ON connections(status);

-- ── CONVERSACIONES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id_1       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_id_2       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id_1, user_id_2)
);

CREATE INDEX idx_conversations_u1      ON conversations(user_id_1);
CREATE INDEX idx_conversations_u2      ON conversations(user_id_2);
CREATE INDEX idx_conversations_last_msg ON conversations(last_message_at DESC);

-- ── MENSAJES ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content         TEXT,
  tipo            VARCHAR(20) DEFAULT 'text' CHECK (tipo IN ('text','image','audio','verse')),
  media_url       TEXT,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_conv    ON messages(conversation_id);
CREATE INDEX idx_messages_sender  ON messages(sender_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);

-- ── VERSÍCULOS DIARIOS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_verses (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verse_text     TEXT        NOT NULL,
  verse_reference VARCHAR(100) NOT NULL,
  tema           VARCHAR(50),
  reflection     TEXT,
  prayer         TEXT,
  date_featured  DATE UNIQUE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_daily_verses_date ON daily_verses(date_featured);

-- ── REPORTES ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  razon        VARCHAR(80) NOT NULL,
  descripcion  TEXT,
  status       VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','reviewed','resolved','dismissed')),
  resolved_by  UUID REFERENCES users(id),
  resolved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reports_reporter ON reports(reporter_id);
CREATE INDEX idx_reports_reported ON reports(reported_id);
CREATE INDEX idx_reports_status   ON reports(status);

-- ── USUARIOS BLOQUEADOS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blocked_users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

CREATE INDEX idx_blocked_blocker ON blocked_users(blocker_id);
CREATE INDEX idx_blocked_blocked ON blocked_users(blocked_id);

-- ================================================
-- TABLAS ESPIRITUALES (v2)
-- ================================================

-- ── PERFIL ESPIRITUAL ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS spiritual_profiles (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  total_xp                  INT  DEFAULT 0,
  nivel                     INT  DEFAULT 1,
  racha_devocional          INT  DEFAULT 0,
  max_racha_devocional      INT  DEFAULT 0,
  ultimo_devocional         DATE,
  total_devocionales        INT  DEFAULT 0,
  total_retos_completados   INT  DEFAULT 0,
  total_oraciones_compartidas   INT DEFAULT 0,
  total_oraciones_intercedidas  INT DEFAULT 0,
  monedas_fe                INT  DEFAULT 100,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sp_user   ON spiritual_profiles(user_id);
CREATE INDEX idx_sp_xp     ON spiritual_profiles(total_xp DESC);
CREATE INDEX idx_sp_nivel  ON spiritual_profiles(nivel);
CREATE INDEX idx_sp_racha  ON spiritual_profiles(racha_devocional DESC);

-- ── HISTORIAL DE XP ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS xp_history (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  xp_ganado        INT  NOT NULL,
  motivo           VARCHAR(255),
  total_xp_despues INT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_xp_history_user    ON xp_history(user_id);
CREATE INDEX idx_xp_history_created ON xp_history(created_at DESC);

-- ── BADGES ESPIRITUALES ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_spiritual_badges (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id    VARCHAR(100) NOT NULL,
  obtained_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

CREATE INDEX idx_badges_user ON user_spiritual_badges(user_id);

-- ── COMPLETACIONES DE DEVOCIONAL ──────────────────────────────────
CREATE TABLE IF NOT EXISTS devotional_completions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  versiculo_id   UUID REFERENCES daily_verses(id),
  date_completed DATE NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date_completed)
);

CREATE INDEX idx_dev_completions_user ON devotional_completions(user_id);
CREATE INDEX idx_dev_completions_date ON devotional_completions(date_completed);

-- ── COMPLETACIONES DE MISIONES ────────────────────────────────────
CREATE TABLE IF NOT EXISTS mission_completions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mission_id   VARCHAR(100) NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mission_comp_user ON mission_completions(user_id);
CREATE INDEX idx_mission_comp_date ON mission_completions(completed_at DESC);

-- ── SUSCRIPCIONES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_type       VARCHAR(20) NOT NULL DEFAULT 'free'
                    CHECK (plan_type IN ('free','premium','vip')),
  is_active       BOOLEAN DEFAULT FALSE,
  started_at      TIMESTAMPTZ DEFAULT NOW(),
  expires_at      TIMESTAMPTZ,
  transaction_id  VARCHAR(255),
  precio_pagado   INT DEFAULT 0,
  plataforma      VARCHAR(30) CHECK (plataforma IN ('stripe','apple','google')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subs_user    ON subscriptions(user_id);
CREATE INDEX idx_subs_active  ON subscriptions(is_active);
CREATE INDEX idx_subs_expires ON subscriptions(expires_at);

-- ── COMPRAS CON MONEDAS DE FE ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS monedas_purchases (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id          VARCHAR(100) NOT NULL,
  monedas_gastadas INT NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_monedas_purchases_user ON monedas_purchases(user_id);

-- ================================================
-- FUNCIÓN: actualizar updated_at automáticamente
-- ================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a tablas con updated_at
DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['users','profiles','spiritual_profiles','subscriptions']
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at
       BEFORE UPDATE ON %s
       FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
      tbl, tbl
    );
  END LOOP;
END $$;

-- ================================================
-- ROW LEVEL SECURITY (opcional — recomendado)
-- Activar si usas Supabase Auth en frontend.
-- Con service_key desde backend no aplica.
-- ================================================
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
-- (configurar políticas según necesidad)

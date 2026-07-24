-- ================================================
-- ÁGAPE v10 — Migración de correcciones (auditoría 2026-07)
-- Ejecutar DESPUÉS de todas las migraciones anteriores.
-- Crea tablas y columnas que el código en src/ ya referenciaba
-- pero que nunca se habían migrado, causando errores 500 en:
--   - Entorno (modo invisible)
--   - Eventos comunitarios (EventsScreen)
--   - Verificación de identidad (VerificationScreen)
--   - Webhook de Wompi
-- ================================================

-- ── 1. Modo invisible (Premium) ───────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS modo_invisible BOOLEAN DEFAULT FALSE;

-- ── 1b. Preferencia de género (a quién quiere ver en el feed) ─────
-- El registro ya recogía esta preferencia mostrando "Me interesan:
-- mujeres/hombres/todos", pero nunca se guardaba ni se usaba para
-- filtrar el feed — cualquier usuario veía perfiles de cualquier
-- género sin importar su elección.
ALTER TABLE users ADD COLUMN IF NOT EXISTS busca_genero VARCHAR(20) DEFAULT 'todos'
  CHECK (busca_genero IN ('hombres', 'mujeres', 'todos'));

-- ── 2. Eventos comunitarios cercanos ──────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  creador_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  titulo         VARCHAR(120) NOT NULL,
  tipo           VARCHAR(50),
  ciudad         VARCHAR(100),
  fecha_evento   TIMESTAMPTZ NOT NULL,
  max_personas   INT         DEFAULT 10,
  descripcion    TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_fecha   ON events(fecha_evento);
CREATE INDEX IF NOT EXISTS idx_events_creador ON events(creador_id);
CREATE INDEX IF NOT EXISTS idx_events_ciudad  ON events(ciudad);

CREATE TABLE IF NOT EXISTS event_participants (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_participants_event ON event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_user  ON event_participants(user_id);

-- ── 3. Verificación de identidad (selfie) ─────────────────────────
CREATE TABLE IF NOT EXISTS verification_requests (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  selfie_url    TEXT        NOT NULL,
  status        VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_requests_user   ON verification_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_requests_status ON verification_requests(status);

-- ── 4. Referencias de pago Wompi ──────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_references (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        REFERENCES users(id) ON DELETE CASCADE,
  referencia   VARCHAR(255) NOT NULL UNIQUE,
  plan_type    VARCHAR(20),
  monto        INT,
  status       VARCHAR(20) DEFAULT 'PENDING',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_references_user       ON payment_references(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_references_referencia ON payment_references(referencia);

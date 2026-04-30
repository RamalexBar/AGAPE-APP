-- ================================================
-- ÁGAPE v3.0 — Migración: Cumplimiento App Store
-- Ejecutar DESPUÉS de migration_final.sql
-- ================================================

-- ── 1. Consentimientos legales (GDPR + App Store requirement) ────
CREATE TABLE IF NOT EXISTS legal_consents (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  terms_version    VARCHAR(10) NOT NULL,
  privacy_version  VARCHAR(10) NOT NULL,
  accepted_at      TIMESTAMPTZ DEFAULT NOW(),
  ip_address       INET,
  user_agent       TEXT
);

CREATE INDEX idx_legal_consents_user    ON legal_consents(user_id);
CREATE INDEX idx_legal_consents_version ON legal_consents(user_id, terms_version, privacy_version);

-- ── 2. Tokens de reset de contraseña ─────────────────────────────
CREATE TABLE IF NOT EXISTS password_resets (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(64) NOT NULL UNIQUE,
  expira_at   TIMESTAMPTZ NOT NULL,
  usado       BOOLEAN     DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_password_resets_user  ON password_resets(user_id);
CREATE INDEX idx_password_resets_token ON password_resets(token_hash);

-- Auto-limpiar tokens viejos
CREATE OR REPLACE FUNCTION cleanup_expired_password_resets()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM password_resets WHERE expira_at < NOW() - INTERVAL '1 day';
END;
$$;

-- ── 3. Advertencias de moderación ────────────────────────────────
CREATE TABLE IF NOT EXISTS user_warnings (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reporte_id  UUID        REFERENCES reports(id),
  motivo      TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_warnings_user ON user_warnings(user_id);

-- ── 4. Campo suspended_until en users ────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ;

-- ── 5. Campos de perfil espiritual enriquecido ────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS intencion_relacion  VARCHAR(30) DEFAULT 'amistad'
  CHECK (intencion_relacion IN ('amistad', 'noviazgo_cristiano', 'matrimonio'));

ALTER TABLE users ADD COLUMN IF NOT EXISTS nivel_compromiso    VARCHAR(20) DEFAULT 'serio'
  CHECK (nivel_compromiso IN ('casual', 'serio', 'muy_serio'));

ALTER TABLE users ADD COLUMN IF NOT EXISTS frecuencia_iglesia  VARCHAR(20) DEFAULT 'semanal'
  CHECK (frecuencia_iglesia IN ('nunca', 'mensual', 'semanal', 'diaria'));

-- ── 6. Campo nota_moderador + accion_tomada en reports ───────────
ALTER TABLE reports ADD COLUMN IF NOT EXISTS nota_moderador TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS accion_tomada VARCHAR(20)
  CHECK (accion_tomada IN ('dismiss', 'warn', 'suspend', 'ban'));

-- ── 7. Índice de moderación ───────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_reports_pending ON reports(status, created_at)
  WHERE status = 'pending';

-- ── 8. Vista: usuarios suspendidos actualmente ───────────────────
CREATE OR REPLACE VIEW v_usuarios_suspendidos AS
SELECT id, nombre, email, suspended_until, ban_reason
FROM users
WHERE (suspended_until IS NOT NULL AND suspended_until > NOW())
   OR is_banned = TRUE
ORDER BY is_banned DESC, suspended_until DESC;

-- ── 9. Función: verificar si usuario puede usar la app ───────────
CREATE OR REPLACE FUNCTION user_can_access(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE v_user RECORD;
BEGIN
  SELECT is_active, is_banned, suspended_until INTO v_user
  FROM users WHERE id = p_user_id;

  IF NOT FOUND THEN RETURN FALSE; END IF;
  IF NOT v_user.is_active THEN RETURN FALSE; END IF;
  IF v_user.is_banned THEN RETURN FALSE; END IF;
  IF v_user.suspended_until IS NOT NULL AND v_user.suspended_until > NOW() THEN RETURN FALSE; END IF;
  RETURN TRUE;
END;
$$;

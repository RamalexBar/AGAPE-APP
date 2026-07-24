-- ================================================
-- ÁGAPE v10 — Piezas faltantes de migration_v10_fixes.sql
-- (events, event_participants y verification_requests ya existen —
-- esto es solo lo que falta: modo_invisible, busca_genero y payment_references)
-- ================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS modo_invisible BOOLEAN DEFAULT FALSE;

ALTER TABLE users ADD COLUMN IF NOT EXISTS busca_genero VARCHAR(20) DEFAULT 'todos'
  CHECK (busca_genero IN ('hombres', 'mujeres', 'todos'));

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

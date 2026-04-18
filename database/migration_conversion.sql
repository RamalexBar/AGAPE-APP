-- ================================================
-- ÁGAPE — Migración: Sistema de Conversión
-- CORREGIDO: crea monetization_events si no existe
-- ================================================

-- ── Vistas de perfil ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profile_views (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewed_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(viewer_id, target_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_views_target ON profile_views(target_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_viewed ON profile_views(viewed_at DESC);

-- ── Eventos de paywall (analytics) ───────────────────────────────
CREATE TABLE IF NOT EXISTS paywall_events (
  id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tipo     VARCHAR(50) NOT NULL,
  visto_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_paywall_events_user ON paywall_events(user_id);
CREATE INDEX IF NOT EXISTS idx_paywall_events_tipo ON paywall_events(tipo, visto_at DESC);

-- ── monetization_events (por si no se ejecutó migration_monetization) ──
CREATE TABLE IF NOT EXISTS monetization_events (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  evento     VARCHAR(80) NOT NULL,
  metadata   JSONB       DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mon_events_user    ON monetization_events(user_id);
CREATE INDEX IF NOT EXISTS idx_mon_events_evento  ON monetization_events(evento);
CREATE INDEX IF NOT EXISTS idx_mon_events_created ON monetization_events(created_at DESC);

-- ── Vista: tasa de conversión por trigger ────────────────────────
CREATE OR REPLACE VIEW v_paywall_conversion AS
SELECT
  pe.tipo,
  COUNT(pe.id)                                            AS veces_mostrado,
  COUNT(DISTINCT pe.user_id)                              AS usuarios_unicos,
  COUNT(DISTINCT me.user_id)                              AS convirtieron,
  ROUND(
    100.0 * COUNT(DISTINCT me.user_id) / NULLIF(COUNT(DISTINCT pe.user_id), 0), 1
  )                                                       AS conversion_pct
FROM paywall_events pe
LEFT JOIN monetization_events me
  ON me.user_id = pe.user_id
  AND me.evento = 'subscription_activated'
  AND me.created_at >= pe.visto_at
  AND me.created_at <= pe.visto_at + INTERVAL '24 hours'
GROUP BY pe.tipo
ORDER BY conversion_pct DESC NULLS LAST;

-- ── Índice extra en swipes ────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_swipes_interest_lookup
  ON swipes(to_user_id, action, created_at DESC)
  WHERE action IN ('connect', 'like');

-- ════════════════════════════════════════════════════════════════════════
-- 0032 — Rastreabilidade problema → ação
--
-- Quando um mutirão nasce de uma ocorrência ("criar mutirão para esta
-- ocorrência"), guardamos o vínculo. A página do alerta pode então mostrar
-- "esta denúncia gerou uma ação" — o ciclo cívico completo, mensurável
-- para relatórios de impacto.
-- ════════════════════════════════════════════════════════════════════════
ALTER TABLE mutiroes
  ADD COLUMN IF NOT EXISTS alerta_id uuid REFERENCES ameacas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS mutiroes_alerta_id_idx ON mutiroes (alerta_id) WHERE alerta_id IS NOT NULL;

-- (0032b aplicado junto) View pública com alerta_id ao final:
-- CREATE OR REPLACE VIEW mutiroes_publicos AS ... , m.alerta_id FROM ...

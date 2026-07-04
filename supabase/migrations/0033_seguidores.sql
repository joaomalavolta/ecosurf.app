-- ════════════════════════════════════════════════════════════════════════
-- 0033 — Seguir usuários (v1)
--
-- Decisões de produto: SEM contagem pública de seguidores (nada de placar
-- de popularidade num app cívico) e SEM notificações por enquanto. Cada
-- pessoa enxerga apenas quem ELA segue — por isso a RLS é estritamente
-- self: nem o seguido sabe quem o segue nesta versão.
-- ════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS seguidores (
  seguidor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seguido_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  criado_em   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (seguidor_id, seguido_id),
  CHECK (seguidor_id <> seguido_id)
);

ALTER TABLE seguidores ENABLE ROW LEVEL SECURITY;

CREATE POLICY seguidores_self_select ON seguidores
  FOR SELECT TO authenticated USING (seguidor_id = auth.uid());
CREATE POLICY seguidores_self_insert ON seguidores
  FOR INSERT TO authenticated WITH CHECK (seguidor_id = auth.uid());
CREATE POLICY seguidores_self_delete ON seguidores
  FOR DELETE TO authenticated USING (seguidor_id = auth.uid());

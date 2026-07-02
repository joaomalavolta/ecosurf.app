-- ════════════════════════════════════════════════════════════════════════
-- 0030 — Favoritos reais (por usuário)
--
-- O filtro "Favoritos" do Radar era cenografia: lista fixa no código, igual
-- para todos, sem como favoritar. Esta tabela guarda a escolha de cada
-- pessoa, sincronizada entre aparelhos. RLS: cada um só vê e mexe nos seus.
-- ════════════════════════════════════════════════════════════════════════

BEGIN;

CREATE TABLE IF NOT EXISTS favoritos (
  user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pico_id   text NOT NULL REFERENCES picos(id) ON DELETE CASCADE,
  criado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, pico_id)
);

ALTER TABLE favoritos ENABLE ROW LEVEL SECURITY;

CREATE POLICY favoritos_self_select ON favoritos
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY favoritos_self_insert ON favoritos
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY favoritos_self_delete ON favoritos
  FOR DELETE TO authenticated USING (user_id = auth.uid());

COMMIT;

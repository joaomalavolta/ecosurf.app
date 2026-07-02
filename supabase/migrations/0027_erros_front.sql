-- ════════════════════════════════════════════════════════════════════════
-- 0027 — Monitoramento de erros do front
--
-- Erros de JavaScript no celular dos usuários hoje somem sem rastro (só os
-- erros de servidor aparecem na Vercel). Esta tabela recebe relatórios leves
-- do próprio app: mensagem, stack encurtada, rota e user agent.
--
-- Segurança e privacidade:
--   • INSERT: qualquer um (o erro acontece no navegador de visitantes também).
--   • SELECT: só papéis de equipe (admin/super_admin) — via view.
--   • Sem dados pessoais: não gravamos user id, e-mail ou localização.
--   • Campos com limite de tamanho (CHECK) contra abuso/flood.
-- ════════════════════════════════════════════════════════════════════════

BEGIN;

CREATE TABLE IF NOT EXISTS erros_front (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  criado_em   timestamptz NOT NULL DEFAULT now(),
  mensagem    text NOT NULL CHECK (char_length(mensagem) <= 500),
  stack       text CHECK (char_length(stack) <= 2000),
  rota        text CHECK (char_length(rota) <= 200),
  user_agent  text CHECK (char_length(user_agent) <= 300),
  versao_app  text CHECK (char_length(versao_app) <= 40)
);

ALTER TABLE erros_front ENABLE ROW LEVEL SECURITY;

-- Qualquer visitante pode relatar um erro (é anônimo por design).
CREATE POLICY erros_front_insert_publico ON erros_front
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Leitura: apenas equipe (mesmo padrão dos outros recursos de staff).
CREATE POLICY erros_front_select_staff ON erros_front
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM perfis pp
    WHERE pp.id = auth.uid() AND pp.papel IN ('admin', 'super_admin')
  ));

-- Limpeza: admins podem apagar o log.
CREATE POLICY erros_front_delete_staff ON erros_front
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM perfis pp
    WHERE pp.id = auth.uid() AND pp.papel IN ('admin', 'super_admin')
  ));

-- Índice para o painel listar por data.
CREATE INDEX IF NOT EXISTS erros_front_criado_em_idx ON erros_front (criado_em DESC);

COMMIT;

-- ════════════════════════════════════════════════════════════════════════
-- 0026 — autor_id na view pública de fotos (para o perfil público)
--
-- A página de perfil mostra as contribuições da pessoa. Alertas e mutirões já
-- expõem autor_id nas suas views; fotos_publicas só tinha autor_nome. Aqui
-- adicionamos autor_id (ao final, por causa do CREATE OR REPLACE) para permitir
-- filtrar as fotos de um autor. Coerente com a transparência total: autoria é
-- pública por design.
-- ════════════════════════════════════════════════════════════════════════

BEGIN;

CREATE OR REPLACE VIEW fotos_publicas WITH (security_invoker = true) AS
  SELECT f.id,
         f.pico_id,
         f.capturada_em,
         f.storage_path,
         f.altura_mare_m,
         f.vento_tipo,
         f.observacao,
         f.procedencia,
         COALESCE(p.nome, 'anônimo'::text) AS autor_nome,
         f.thumb_path,
         f.autor_id
    FROM fotos f
    LEFT JOIN perfis p ON p.id = f.autor_id
   WHERE f.deleted_at IS NULL
     AND COALESCE(f.status, 'aprovada'::text) = 'aprovada'::text
     AND NOT COALESCE(f.oculta, false);

GRANT SELECT ON fotos_publicas TO anon, authenticated;

COMMIT;

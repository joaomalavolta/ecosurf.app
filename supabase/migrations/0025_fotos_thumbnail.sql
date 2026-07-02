-- ════════════════════════════════════════════════════════════════════════
-- 0025 — Miniaturas (thumbnails) das fotos
--
-- Adiciona thumb_path: caminho de uma versão pequena (~400px WebP) gerada no
-- upload. O feed usa a miniatura (leve no 4G da praia); a página do pico usa
-- a foto cheia (storage_path). Fotos antigas ficam com thumb_path nulo e o
-- app cai na foto cheia — sem quebrar.
-- ════════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE fotos ADD COLUMN IF NOT EXISTS thumb_path text;

-- Expõe thumb_path na view pública (adicionada AO FINAL: o Postgres não deixa
-- inserir coluna no meio com CREATE OR REPLACE). Mantém security_invoker.
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
         f.thumb_path
    FROM fotos f
    LEFT JOIN perfis p ON p.id = f.autor_id
   WHERE f.deleted_at IS NULL
     AND COALESCE(f.status, 'aprovada'::text) = 'aprovada'::text
     AND NOT COALESCE(f.oculta, false);

GRANT SELECT ON fotos_publicas TO anon, authenticated;

COMMIT;

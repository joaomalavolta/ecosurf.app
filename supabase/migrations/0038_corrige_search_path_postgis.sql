-- 0038 — Corrige o cadastro de picos: type "geography" does not exist
--
-- REGRESSÃO introduzida pela 0035 (hardening dos advisors). Lá fixamos
-- `search_path='public'` em picos_evita_duplicado() para silenciar o aviso
-- function_search_path_mutable — mas essa função usa `::geography` e
-- ST_DWithin, e no Supabase o PostGIS vive no schema `extensions`.
--
-- Com o caminho restrito a `public`, o tipo geography deixou de resolver e
-- TODO cadastro de pico passou a falhar com:
--   Erro: type "geography" does not exist
--
-- A correção mantém o search_path fixo (o advisor continua satisfeito) e
-- apenas inclui `extensions`, que é onde o PostGIS está de fato.
--
-- Referência: fotos_antifake() já usava 'public, extensions' — era a única
-- função com PostGIS que continuou funcionando depois da 0035.

alter function public.picos_evita_duplicado() set search_path = public, extensions;

-- O gatilho de território também roda na tabela picos; mesmo caminho, por
-- segurança (hoje só mexe em texto, mas evita a mesma armadilha no futuro).
alter function public.normalizar_territorio() set search_path = public, extensions;

-- ════════════════════════════════════════════════════════════════════════
-- 0024 — Correções apontadas pelos Security Advisors do Supabase
--
-- (1) Views públicas deixam de rodar como "dono do banco" (SECURITY
--     DEFINER) e passam a respeitar as regras de acesso de quem consulta
--     (security_invoker) — com as policies públicas explícitas que isso
--     exige, coerentes com a política de transparência total.
-- (2) Funções ganham search_path fixo (evita sequestro de resolução).
-- (3) Funções administrativas deixam de ser chamáveis sem login.
-- (4) Buckets públicos deixam de permitir listagem do acervo inteiro
--     (as URLs públicas diretas continuam funcionando normalmente).
-- ════════════════════════════════════════════════════════════════════════

BEGIN;

-- ═══ 1. Views com security_invoker + policies públicas explícitas ═══

-- ameacas: a leitura pública agora é declarada na tabela (transparência
-- total: qualquer pessoa vê qualquer alerta), e a view apenas dá forma.
DROP POLICY IF EXISTS ameacas_leitura_publica ON ameacas;
CREATE POLICY ameacas_leitura_publica ON ameacas FOR SELECT USING (true);

-- perfis_publicos usa criado_em, que só estava liberado para logados.
GRANT SELECT (criado_em) ON perfis TO anon;

ALTER VIEW public.ameacas_publicas SET (security_invoker = true);
ALTER VIEW public.perfis_publicos SET (security_invoker = true);
ALTER VIEW public.mutiroes_publicos SET (security_invoker = true);
ALTER VIEW public.mutirao_participantes_publicos SET (security_invoker = true);

-- ═══ 2. search_path fixo nas funções expostas ═══

ALTER FUNCTION public.admin_indicadores() SET search_path = public;
ALTER FUNCTION public.admin_listar_ameacas() SET search_path = public;
ALTER FUNCTION public.inscrever_mutirao(text) SET search_path = public;

-- ═══ 3. Funções fora do alcance de quem não fez login ═══
-- As duas admin_* checam o papel internamente (staff continua usando);
-- inscrever_mutirao exige um usuário logado por natureza.

REVOKE EXECUTE ON FUNCTION public.admin_indicadores() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_listar_ameacas() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.inscrever_mutirao(text) FROM anon, public;

-- ═══ 4. Buckets públicos sem listagem do acervo ═══
-- O app acessa fotos e avatares por URL pública direta (getPublicUrl),
-- que não depende de policy de SELECT. Remover as policies de leitura
-- impede que alguém enumere todos os arquivos via API.

DROP POLICY IF EXISTS "avatars leitura" ON storage.objects;
DROP POLICY IF EXISTS "avatars read public" ON storage.objects;
DROP POLICY IF EXISTS "fotos leitura autenticado" ON storage.objects;
DROP POLICY IF EXISTS "fotos leitura publica" ON storage.objects;

COMMIT;

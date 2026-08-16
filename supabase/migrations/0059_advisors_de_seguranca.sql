-- 0059 — Os três avisos de segurança que sobraram (e os que são falso alarme)
--
-- Passagem pelos advisors de segurança do Supabase depois da faxina da 0058.
-- Três apontamentos eram reais; o resto é ruído explicado no fim.
--
-- ── 1. `perfis_publicos` rodava como dono, ignorando a RLS (nível ERROR) ──
--
-- View criada sem `security_invoker`, o que a faz rodar com as permissões de
-- quem a criou (postgres) em vez das de quem consulta. Na prática ela hoje não
-- mostra nada a mais do que `perfis_leitura_publica` já libera, então não
-- vazava nada — mas é um cano que passa por fora da RLS. Se amanhã a leitura
-- de `perfis` for restringida (ou se a RESTRICTIVE `sem_anonimo` da 0053
-- precisar valer aqui), a view continuaria entregando tudo, calada.
--
-- Conferido antes de aplicar, em teste com rollback: anon e usuário comum
-- enxergam as mesmas 4 linhas com e sem a mudança.
--
-- ── 2. `nao_anonimo()` sem search_path fixo (nível WARN) ─────────────────
--
-- Função minha, da 0053, e é a que veta sessão anônima em 24 tabelas. Sem
-- `set search_path`, ela resolve nomes pela lista de quem chama — exatamente
-- a função onde isso menos deveria ser possível. `auth.jwt()` já vinha
-- qualificado, então `search_path = ''` não muda o comportamento; muda a
-- garantia.
--
-- ── 3. Funções SECURITY DEFINER abertas ao `anon` (nível WARN) ───────────
--
-- `comunidade_criador()` e `eh_admin_comunidade()` estavam com EXECUTE para
-- PUBLIC, o que as torna chamáveis em /rest/v1/rpc/... sem login. A primeira
-- devolve o dono de qualquer comunidade a quem perguntar. Nenhuma das duas é
-- chamada pelo app — só aparecem dentro das policies de `membros_comunidade`,
-- todas `to authenticated`. Então authenticated mantém, o resto perde.
--
-- (Lembrete da 0044: revogar de `anon` sem revogar de `public` não faz nada.)

alter view public.perfis_publicos set (security_invoker = true);

create or replace function public.nao_anonimo()
returns boolean
language sql
stable
set search_path = ''
as $$
  -- Claim ausente (usuário normal) conta como não-anônimo.
  select coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
$$;

revoke execute on function public.nao_anonimo() from public, anon;
grant  execute on function public.nao_anonimo() to authenticated;

revoke execute on function public.comunidade_criador(uuid)  from public, anon;
revoke execute on function public.eh_admin_comunidade(uuid) from public, anon;
grant  execute on function public.comunidade_criador(uuid)  to authenticated;
grant  execute on function public.eh_admin_comunidade(uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- O que o advisor aponta e NÃO é para mexer — anotado para o próximo que
-- olhar a lista e achar que está tudo aberto:
--
-- · `admin_indicadores()` e `admin_listar_ameacas()` aparecem como
--   "executável por authenticated". É verdade, e é assim que tem que ser: as
--   duas começam com um IF NOT EXISTS (... papel IN ('admin','super_admin',
--   'moderator','analyst')) THEN RAISE EXCEPTION 'acesso negado'. O portão
--   está dentro da função, que é o lugar certo para ele.
--
-- · `abrir_conversa()`, `inscrever_mutirao()` e `marcar_notificacoes_lidas()`
--   são justamente as funções que o app chama em nome do usuário. Existem
--   para serem chamadas por quem está logado.
--
-- · `pico_dentro_do_limite(p_user uuid)` é usada dentro da policy de INSERT em
--   `picos`, então `authenticated` precisa do EXECUTE. Ela aceita um uuid
--   qualquer e conta quantos picos aquela pessoa cadastrou nas últimas 24h —
--   dá para descobrir se um terceiro está perto da cota. É pouca coisa e o
--   conserto (trocar o parâmetro por auth.uid() interno) mexe na policy;
--   fica anotado, não feito.
-- ─────────────────────────────────────────────────────────────────────────

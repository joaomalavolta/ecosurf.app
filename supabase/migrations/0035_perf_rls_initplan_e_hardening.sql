-- ════════════════════════════════════════════════════════════════════════
-- P1: performance de RLS + hardening (advisors do Supabase).
--  1) auth_rls_initplan: envolve auth.uid()/auth.jwt() em (select ...) para o
--     Postgres avaliar UMA vez por query, não por linha. Semanticamente igual.
--  2) function_search_path_mutable: fixa search_path das 3 funções sinalizadas.
--  3) comunidade_criador_admin é trigger — tira do surface de RPC (revoke).
--  4) índices de cobertura nas FKs sem índice.
-- Idempotente: o passo 1 só toca políticas ainda não-envolvidas (detecção
-- case-insensitive, pois o Postgres renderiza o wrapper como "( SELECT ... )").
-- Já aplicada no projeto via MCP; este arquivo mantém o repo em sincronia.
-- ════════════════════════════════════════════════════════════════════════

-- 1) RLS initplan — reescreve só políticas com auth.* "cru" (sem (select ...))
do $$
declare r record; stmt text; nq text; nc text;
begin
  for r in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (qual ~* 'auth\.(uid|jwt)\(\)' or coalesce(with_check,'') ~* 'auth\.(uid|jwt)\(\)')
      and not (coalesce(qual,'') ~* 'select\s+auth\.(uid|jwt)'
               or coalesce(with_check,'') ~* 'select\s+auth\.(uid|jwt)')
  loop
    stmt := 'alter policy ' || quote_ident(r.policyname)
         || ' on ' || quote_ident(r.schemaname) || '.' || quote_ident(r.tablename);
    if r.qual is not null then
      nq := replace(replace(r.qual, 'auth.uid()', '(select auth.uid())'), 'auth.jwt()', '(select auth.jwt())');
      stmt := stmt || ' using (' || nq || ')';
    end if;
    if r.with_check is not null then
      nc := replace(replace(r.with_check, 'auth.uid()', '(select auth.uid())'), 'auth.jwt()', '(select auth.jwt())');
      stmt := stmt || ' with check (' || nc || ')';
    end if;
    execute stmt;
  end loop;
end $$;

-- 2) search_path fixo nas funções sinalizadas
alter function public.comunidade_criador_admin() set search_path = 'public';
alter function public.normalizar_nome_pico(text)  set search_path = 'public';
alter function public.picos_evita_duplicado()     set search_path = 'public';

-- 3) trigger não precisa ser chamável por RPC
revoke execute on function public.comunidade_criador_admin() from public, anon, authenticated;

-- 4) índices de cobertura nas FKs
create index if not exists fk_admin_logs_admin_id on public.admin_logs (admin_id);
create index if not exists fk_ameacas_comunidade_id on public.ameacas (comunidade_id);
create index if not exists fk_ameacas_denunciante_id on public.ameacas (denunciante_id);
create index if not exists fk_ameacas_pico_id on public.ameacas (pico_id);
create index if not exists fk_curtidas_autor_id on public.curtidas (autor_id);
create index if not exists fk_denuncias_autor_id on public.denuncias (autor_id);
create index if not exists fk_denuncias_foto_id on public.denuncias (foto_id);
create index if not exists fk_favoritos_pico_id on public.favoritos (pico_id);
create index if not exists fk_fotos_autor_id on public.fotos (autor_id);
create index if not exists fk_fotos_comunidade_id on public.fotos (comunidade_id);
create index if not exists fk_fotos_deleted_by on public.fotos (deleted_by);
create index if not exists fk_fotos_feed_dia_id on public.fotos (feed_dia_id);
create index if not exists fk_mutirao_participantes_user_id on public.mutirao_participantes (user_id);
create index if not exists fk_mutiroes_comunidade_id on public.mutiroes (comunidade_id);
create index if not exists fk_mutiroes_organizador_id on public.mutiroes (organizador_id);
create index if not exists fk_mutiroes_pico_id on public.mutiroes (pico_id);
create index if not exists fk_perfis_pico_principal on public.perfis (pico_principal);
create index if not exists fk_picos_criado_por on public.picos (criado_por);
create index if not exists fk_picos_regiao_surf_id on public.picos (regiao_surf_id);
create index if not exists fk_rascunhos_user_id on public.rascunhos (user_id);
create index if not exists fk_seguidores_seguido_id on public.seguidores (seguido_id);

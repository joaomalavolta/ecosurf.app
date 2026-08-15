-- 0053 — O Ecosurf não tem usuário anônimo. Decisão de produto, agora com dente.
--
-- Hoje o projeto não emite sessão anônima, mas isso é um interruptor de
-- distância no painel do Supabase — e o levantamento mostrou que 22 das 25
-- policies de escrita NÃO barravam sessão anônima. Só 3 (ameacas, denuncias,
-- fotos) tinham a checagem, feita à mão, uma a uma. Quem escrevesse uma
-- policy nova (eu, hoje, cinco vezes) esquecia — e esquecia em silêncio.
--
-- Em vez de emendar 22 policies e torcer para lembrar na 23ª, uma policy
-- RESTRICTIVE por tabela: restritivas são combinadas com AND por cima de
-- TODAS as permissivas, então esta vale como veto geral. Policy nova que
-- alguém escrever amanhã já nasce coberta.
--
-- ⚠️ Não cobre SECURITY DEFINER — ver 0054 e 0055.
--
-- ⚠️ Tabela nova precisa desta policy: rode o bloco DO abaixo de novo, ou
-- copie a linha para a migration que criar a tabela.

create or replace function public.nao_anonimo()
returns boolean
language sql
stable
as $$
  -- Claim ausente (usuário normal) conta como não-anônimo.
  select coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
$$;

revoke execute on function public.nao_anonimo() from public, anon;
grant execute on function public.nao_anonimo() to authenticated;

do $$
declare t text;
begin
  for t in
    select c.relname
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
     order by 1
  loop
    execute format('drop policy if exists sem_anonimo on public.%I', t);
    execute format(
      'create policy sem_anonimo on public.%I as restrictive to authenticated '
      'using (public.nao_anonimo()) with check (public.nao_anonimo())', t
    );
  end loop;
end $$;

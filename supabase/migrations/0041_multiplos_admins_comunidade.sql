-- 0041 — Múltiplos administradores de comunidade, com o criador no controle
--
-- Antes: `membros_promover` deixava QUALQUER admin promover/rebaixar qualquer
-- um — inclusive rebaixar o próprio criador — e o `with_check` era NULL, ou
-- seja, a linha resultante não era validada de forma alguma (dava até para
-- trocar o usuario_id da linha).
--
-- Agora:
--   • criador  → concede e remove 'admin'; mexe em qualquer membro (menos em
--                si mesmo, para não deixar a comunidade sem dono);
--   • admin    → gerencia membros comuns (autor/seguidor), mas NÃO concede
--                nem remove 'admin', e não encosta na linha do criador.
--
-- As funções são SECURITY DEFINER de propósito: consultar membros_comunidade
-- dentro de uma policy da própria tabela recursaria na RLS. Elas só devolvem
-- dado já público (criador_id aparece em comunidades_publicas) ou um booleano
-- sobre o próprio usuário.

create or replace function public.comunidade_criador(p_comunidade uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.criador_id from comunidades c where c.id = p_comunidade
$$;

create or replace function public.eh_admin_comunidade(p_comunidade uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from membros_comunidade m
    where m.comunidade_id = p_comunidade
      and m.usuario_id = (select auth.uid())
      and m.papel = 'admin'
  )
$$;

drop policy if exists membros_promover on membros_comunidade;
create policy membros_promover on membros_comunidade
for update to authenticated
using (
  (
    public.comunidade_criador(comunidade_id) = (select auth.uid())
    and usuario_id <> (select auth.uid())
  )
  or (
    public.eh_admin_comunidade(comunidade_id)
    and papel <> 'admin'
    and usuario_id <> public.comunidade_criador(comunidade_id)
  )
)
with check (
  (
    public.comunidade_criador(comunidade_id) = (select auth.uid())
    and usuario_id <> (select auth.uid())
  )
  or (
    public.eh_admin_comunidade(comunidade_id)
    and papel in ('autor', 'seguidor')
    and usuario_id <> public.comunidade_criador(comunidade_id)
  )
);

drop policy if exists membros_sair on membros_comunidade;
create policy membros_sair on membros_comunidade
for delete to authenticated
using (
  usuario_id = (select auth.uid())
  or public.comunidade_criador(comunidade_id) = (select auth.uid())
  or (
    public.eh_admin_comunidade(comunidade_id)
    and papel <> 'admin'
    and usuario_id <> public.comunidade_criador(comunidade_id)
  )
);

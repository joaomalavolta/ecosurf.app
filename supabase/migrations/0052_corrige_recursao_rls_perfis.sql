-- 0052 — Perfil não salvava para NINGUÉM: recursão infinita na RLS de `perfis`
--
-- As policies de staff criadas na 0017 perguntavam "esta pessoa é admin?" com
-- um EXISTS (select 1 from perfis ...) — dentro de uma policy DA PRÓPRIA
-- perfis. O Postgres detecta o laço e aborta a operação inteira com 42P17,
-- mesmo para quem só queria gravar o próprio nome pela policy `perfis_self`:
-- as policies de um comando são avaliadas em OR, então basta UMA recursar
-- para derrubar tudo.
--
-- Ficou dois meses invisível porque o cliente fazia `throw error` com o erro
-- do PostgREST, que não é um Error — a tela caía na mensagem genérica "Não
-- foi possível salvar agora", sem motivo. Corrigido junto, no app.
--
-- Sintoma na vida real: 16 dos 19 perfis sem nome, e o diretório de
-- Ecosurfistas mostrando 3 pessoas de 19. Quem fundou uma comunidade
-- aparecia como "Surfista" porque nunca conseguiu gravar o próprio nome.
--
-- A saída é a mesma já usada em comunidades e mensagens: perguntar o papel
-- por uma função SECURITY DEFINER, que roda fora da RLS e não recursa.
--
-- ⚠️ Padrão a seguir: policy em X que consulta X precisa de SECURITY DEFINER.
-- Consultar OUTRA tabela (como `picos_admin_write` faz com perfis) é seguro.

create or replace function public.eh_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from perfis
     where id = (select auth.uid())
       and papel = any (array['admin', 'super_admin'])
  )
$$;

-- As policies chamam esta função como o usuário que consulta: `authenticated`
-- precisa manter o EXECUTE, senão a própria correção quebra a gravação.
revoke execute on function public.eh_staff() from public, anon;
grant execute on function public.eh_staff() to authenticated;

drop policy if exists perfis_admin_update on public.perfis;
create policy perfis_admin_update on public.perfis
  for update to authenticated
  using (public.eh_staff())
  with check (public.eh_staff());

drop policy if exists perfis_admin_delete on public.perfis;
create policy perfis_admin_delete on public.perfis
  for delete to authenticated
  using (public.eh_staff());

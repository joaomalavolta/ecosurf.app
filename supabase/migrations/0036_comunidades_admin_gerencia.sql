-- Super admin / admin podem gerenciar (editar e soft-delete via deleted_at)
-- qualquer comunidade. Aditivo: não altera comunidades_editar (criador +
-- admin-da-comunidade seguem podendo). O soft-delete é UPDATE deleted_at.
-- Já aplicada no projeto via MCP; este arquivo mantém o repo em sincronia.
drop policy if exists comunidades_admin_gerencia on comunidades;
create policy comunidades_admin_gerencia on comunidades for update to authenticated
  using (exists (select 1 from perfis pp
                 where pp.id = (select auth.uid()) and pp.papel in ('admin','super_admin')))
  with check (exists (select 1 from perfis pp
                 where pp.id = (select auth.uid()) and pp.papel in ('admin','super_admin')));

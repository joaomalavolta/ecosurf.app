-- O painel precisa LER as tabelas-base para moderar. As migrações de gestão
-- (0017) criaram políticas de UPDATE/DELETE, mas faltavam as de SELECT:
--  • ameacas não tinha policy de select algum (ninguém lê a base) -> painel vazio.
--  • fotos só liberava fotos de picos públicos -> staff não vê comunidade/abafado.
-- Aqui o staff (moderator+) ganha leitura completa dessas tabelas. O público
-- segue restrito às views curadas (ameacas_publicas / fotos_publicas).

create policy ameacas_staff_select on ameacas for select to authenticated
  using (exists (select 1 from perfis pp where pp.id = auth.uid()
                 and pp.papel in ('moderator', 'admin', 'super_admin')));

create policy fotos_staff_select on fotos for select to authenticated
  using (exists (select 1 from perfis pp where pp.id = auth.uid()
                 and pp.papel in ('moderator', 'admin', 'super_admin')));

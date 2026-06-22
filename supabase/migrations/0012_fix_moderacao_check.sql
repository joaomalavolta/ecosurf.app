-- Aperta a policy de UPDATE de moderação: WITH CHECK também exige moderador
-- (evita write irrestrito sinalizado pelo linter).
drop policy if exists fotos_moderacao on fotos;
create policy fotos_moderacao on fotos
  for update to authenticated
  using (exists (select 1 from perfis p where p.id = auth.uid() and p.papel in ('moderador', 'admin')))
  with check (exists (select 1 from perfis p where p.id = auth.uid() and p.papel in ('moderador', 'admin')));

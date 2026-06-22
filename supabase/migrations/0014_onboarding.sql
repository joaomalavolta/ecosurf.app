-- Perfil estendido para o onboarding (e-mail vem do Auth).
alter table perfis add column if not exists cpf text;
alter table perfis add column if not exists cidade text;
alter table perfis add column if not exists pico_principal text references picos(id) on delete set null;
alter table perfis add column if not exists foto_url text;
alter table perfis add column if not exists onboarded boolean not null default false;

-- LGPD: CPF é dado sensível. Refaz a leitura pública por COLUNA — o CPF não
-- entra no grant de SELECT, ficando "write-only" pela API (só o dono grava;
-- ninguém lê via cliente). Campos de exibição seguem públicos.
drop policy if exists perfis_leitura_publica on perfis;
revoke select on perfis from anon, authenticated;
grant select (id, nome, nivel, papel, cidade, pico_principal, foto_url, onboarded)
  on perfis to anon, authenticated;
create policy perfis_leitura_publica on perfis for select using (true);

-- Avatares (foto de perfil) — leitura pública, escrita autenticada.
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
  on conflict (id) do nothing;
create policy "avatars upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'avatars');
create policy "avatars update" on storage.objects
  for update to authenticated using (bucket_id = 'avatars') with check (bucket_id = 'avatars');
create policy "avatars leitura" on storage.objects
  for select to anon, authenticated using (bucket_id = 'avatars');

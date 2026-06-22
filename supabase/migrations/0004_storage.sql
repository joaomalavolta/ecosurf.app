-- Bucket de fotos (privado: fotos podem identificar pessoas — LGPD).
-- Exibição pública deve usar URL assinada, não bucket público.
insert into storage.buckets (id, name, public)
  values ('fotos', 'fotos', false)
  on conflict (id) do nothing;

-- Autenticado pode subir para o bucket 'fotos'.
create policy "fotos upload autenticado" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'fotos');

-- Autenticado pode ler (app gera URL assinada a partir daqui).
create policy "fotos leitura autenticado" on storage.objects
  for select to authenticated
  using (bucket_id = 'fotos');

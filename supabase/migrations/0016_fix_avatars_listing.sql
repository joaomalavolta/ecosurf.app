-- Bucket público serve por URL direta; a policy de SELECT ampla só permitiria
-- LISTAR todos os avatares. Remove (corrige lint; getPublicUrl segue funcionando).
drop policy if exists "avatars leitura" on storage.objects;

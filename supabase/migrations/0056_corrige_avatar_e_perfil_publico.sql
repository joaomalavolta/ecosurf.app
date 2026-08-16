-- 0056 — Dois bugs que se somavam para deixar gente invisível no app

/* ── 1. Foto de perfil não subia desde junho ────────────────────────────
 *
 * O SDK sobe avatar com `upsert: true`, e o storage traduz isso para
 *   INSERT ... ON CONFLICT (name, bucket_id) DO UPDATE ... RETURNING *
 *
 * Essa forma exige que a RLS deixe o usuário ENXERGAR a linha em conflito —
 * mesmo quando não há conflito nenhum. O bucket `avatars` tinha policy de
 * INSERT, UPDATE e DELETE, mas nenhuma de SELECT. Resultado: 42501 em todo
 * upload, com a mensagem enganosa "new row violates row-level security".
 *
 * Comprovado por eliminação: INSERT simples passava; o mesmo dado via
 * ON CONFLICT falhava, em caminho novo e em caminho existente. O log do
 * Postgres foi o que entregou a forma exata do comando.
 *
 * De quebra, as policies estavam duplicadas ("avatars upload" e "avatars
 * upload own", idênticas). Consolidadas em um conjunto só, todas com o mesmo
 * recorte: cada um manda apenas na própria pasta avatars/<uid>/.
 */

drop policy if exists "avatars upload" on storage.objects;
drop policy if exists "avatars upload own" on storage.objects;
drop policy if exists "avatars update" on storage.objects;
drop policy if exists "avatars update own" on storage.objects;
drop policy if exists "avatars delete" on storage.objects;
drop policy if exists "avatars delete own" on storage.objects;
drop policy if exists "avatars select own" on storage.objects;

create policy "avatars select own" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars upload own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars update own" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

/* ── 2. "Este perfil não está disponível" ───────────────────────────────
 *
 * `perfis_publicos` filtrava por `onboarded = true`. Mas quem entra e define
 * o nome pelo cartão do perfil passa por `definirNome`, que grava só o nome —
 * `onboarded` só é marcado pelo fluxo de onboarding completo.
 *
 * Efeito: 16 das 19 pessoas ficavam sem perfil público, o diretório mostrava
 * 3, e quem fundou uma comunidade aparecia como "Surfista" sem página.
 *
 * O que faz alguém ter perfil público é ter NOME — é o que há para mostrar.
 * `onboarded` continua existindo para o que ele significa (completou o
 * fluxo), e segue em uso no painel administrativo.
 */
create or replace view public.perfis_publicos as
  select id, nome, foto_url, nivel, cidade, criado_em
    from perfis
   where nome is not null and btrim(nome) <> '';

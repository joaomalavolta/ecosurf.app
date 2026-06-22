-- ════════════════════════════════════════════════════════════════════════
-- Sem contribuição anônima + anti-fake server-side + moderação
-- ════════════════════════════════════════════════════════════════════════

-- 1) NADA de anônimo: inserts exigem usuário identificado (não-anônimo).
--    Sessões anônimas do Supabase trazem o claim is_anonymous=true.
drop policy if exists ameacas_insercao on ameacas;
create policy ameacas_insercao on ameacas
  for insert to authenticated
  with check (
    denunciante_id = auth.uid()
    and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  );

drop policy if exists fotos_insercao on fotos;
create policy fotos_insercao on fotos
  for insert to authenticated
  with check (
    autor_id = auth.uid()
    and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  );

alter table ameacas alter column anonima set default false;

-- 2) ANTI-FAKE server-side: coordenadas da captura + trigger que decide a
--    procedência (o cliente não é confiável para isso).
alter table fotos add column if not exists captura_lat numeric;
alter table fotos add column if not exists captura_lng numeric;

create or replace function public.fotos_antifake()
  returns trigger
  language plpgsql
  security definer
  set search_path = public, extensions
as $$
declare
  dist_m double precision;
begin
  -- rejeita timestamp no futuro (relógio adulterado)
  if new.capturada_em > now() + interval '5 minutes' then
    raise exception 'capturada_em no futuro';
  end if;

  -- geofence real: a captura está a até 500 m do pico?
  new.geofence_ok := false;
  if new.captura_lat is not null and new.captura_lng is not null then
    select ST_Distance(
             p.geom::geography,
             ST_SetSRID(ST_MakePoint(new.captura_lng, new.captura_lat), 4326)::geography
           )
      into dist_m
      from picos p
      where p.id = new.pico_id;
    if dist_m is not null and dist_m <= 500 then
      new.geofence_ok := true;
    end if;
  end if;

  -- procedência decidida pelo SERVIDOR (anti-foto-antiga + geofence)
  if new.geofence_ok and new.capturada_em >= now() - interval '2 hours' then
    new.procedencia := 'no-local';
  else
    new.procedencia := 'nao-verificado';
  end if;

  return new;
end;
$$;
revoke execute on function public.fotos_antifake() from anon, authenticated, public;

drop trigger if exists fotos_antifake_trg on fotos;
create trigger fotos_antifake_trg
  before insert on fotos
  for each row execute function public.fotos_antifake();

-- 3) MODERAÇÃO: papel no perfil, ocultar foto, denúncias.
alter table perfis add column if not exists papel text not null default 'membro'
  check (papel in ('membro', 'moderador', 'admin'));
alter table fotos add column if not exists oculta boolean not null default false;
alter table fotos add column if not exists motivo_oculta text;

create table if not exists denuncias (
  id        uuid primary key default gen_random_uuid(),
  foto_id   uuid not null references fotos(id) on delete cascade,
  autor_id  uuid not null references perfis(id) on delete cascade,
  motivo    text,
  criada_em timestamptz not null default now()
);
alter table denuncias enable row level security;

-- usuário identificado denuncia
create policy denuncias_insercao on denuncias
  for insert to authenticated
  with check (
    autor_id = auth.uid()
    and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  );

-- só moderador/admin lê as denúncias
create policy denuncias_leitura_mod on denuncias
  for select to authenticated
  using (exists (select 1 from perfis p where p.id = auth.uid() and p.papel in ('moderador', 'admin')));

-- moderador/admin pode ocultar foto
create policy fotos_moderacao on fotos
  for update to authenticated
  using (exists (select 1 from perfis p where p.id = auth.uid() and p.papel in ('moderador', 'admin')))
  with check (true);

-- 4) Feed público NÃO mostra foto oculta
create or replace view fotos_publicas with (security_invoker = true) as
  select f.id, f.pico_id, f.capturada_em, f.storage_path, f.altura_mare_m,
         f.vento_tipo, f.observacao, f.procedencia,
         coalesce(p.nome, 'anônimo') as autor_nome
  from fotos f
  left join perfis p on p.id = f.autor_id
  where not f.oculta;
grant select on fotos_publicas to anon, authenticated;

-- ════════════════════════════════════════════════════════════════════════
-- 0029 — Anti-fake nível 2: cheque de teletransporte (física entre registros)
--
-- O nível 1 valida cada foto isoladamente (geofence + janela de 2h). O ponto
-- cego: coordenadas FABRICADAS por script batem com o geofence. A defesa que
-- uma requisição isolada não engana é a consistência física com o histórico
-- do próprio autor: duas fotos "no local" em picos distantes num intervalo
-- que exigiria velocidade impossível → a segunda é rebaixada para
-- 'nao-verificado' e o motivo fica registrado para a moderação.
--
-- Nota de honestidade técnica: EXIF foi avaliado e descartado — as fotos do
-- app nascem de canvas (câmera→WebP), que remove metadados; não há o que
-- validar. Física entre registros não depende de metadado declarado.
-- Nota: search_path inclui extensions — PostGIS (geography/ST_*) vive lá no
-- Supabase; sem isso o trigger inteiro quebra (aprendido em teste, hotfix 0029b).
-- ════════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE fotos ADD COLUMN IF NOT EXISTS suspeita_motivo text;

CREATE OR REPLACE FUNCTION public.fotos_antifake()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, extensions
AS $$
declare
  dist_m double precision;
  ult record;
  horas double precision;
  vel_kmh double precision;
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

  -- NÍVEL 2 — teletransporte: compara com a foto anterior do mesmo autor.
  -- Distância > 2 km (ignora ruído de GPS no mesmo pico) percorrida a mais de
  -- 130 km/h (teto generoso: rodovia) é fisicamente implausível.
  new.suspeita_motivo := null;
  if new.autor_id is not null
     and new.captura_lat is not null and new.captura_lng is not null then
    select f.capturada_em,
           coalesce(f.captura_lat, ST_Y(p.geom::geometry)) as lat,
           coalesce(f.captura_lng, ST_X(p.geom::geometry)) as lng
      into ult
      from fotos f
      join picos p on p.id = f.pico_id
      where f.autor_id = new.autor_id
        and f.deleted_at is null
        and f.capturada_em < new.capturada_em
      order by f.capturada_em desc
      limit 1;

    if found and ult.lat is not null then
      select ST_Distance(
               ST_SetSRID(ST_MakePoint(ult.lng, ult.lat), 4326)::geography,
               ST_SetSRID(ST_MakePoint(new.captura_lng, new.captura_lat), 4326)::geography
             ) into dist_m;
      horas := extract(epoch from (new.capturada_em - ult.capturada_em)) / 3600.0;
      if dist_m is not null and dist_m > 2000 and horas > 0 then
        vel_kmh := (dist_m / 1000.0) / horas;
        if vel_kmh > 130 then
          new.procedencia := 'nao-verificado';
          new.suspeita_motivo := format(
            'Deslocamento improvável: %s km em %s min (~%s km/h)',
            round((dist_m / 1000.0)::numeric, 1),
            greatest(1, round((horas * 60)::numeric)),
            round(vel_kmh::numeric)
          );
        end if;
      end if;
    end if;
  end if;

  return new;
end;
$$;

REVOKE EXECUTE ON FUNCTION public.fotos_antifake() FROM anon, authenticated, public;

COMMIT;

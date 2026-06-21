-- Ecosurf — schema base (PostgreSQL + PostGIS)
-- Reflete src/types/domain.ts. Pico é permanente; feed é do dia; foto é nobre.

create extension if not exists postgis;

-- Regiões de surf (curadas, cruzam municípios)
create table regioes_surf (
  id   text primary key,
  nome text not null,
  uf   char(2) not null
);

-- Perfis (espelham auth.users do Supabase)
create table perfis (
  id                uuid primary key references auth.users(id) on delete cascade,
  nome              text,
  telefone_validado boolean not null default false,
  nivel             text default 'novato',
  precisao          int  default 0,
  criado_em         timestamptz not null default now()
);

-- Picos (permanentes, geolocalizados)
create table picos (
  id                  text primary key,                 -- slug: "praia-do-sonho"
  nome                text not null,
  praia               text not null,
  regiao_surf_id      text references regioes_surf(id),
  geom                geometry(Point, 4326) not null,
  municipio           text,                              -- DERIVADO (PostGIS + malha IBGE)
  uf                  char(2),                           -- DERIVADO
  orientacao_praia_deg int  not null default 0,
  fundo               text not null default 'areia' check (fundo in ('areia','pedra','misto')),
  visibilidade        text not null default 'publico'
                        check (visibilidade in ('publico','comunidade','abafado')),
  descricao           text,
  criado_em           timestamptz not null default now()
);
create index picos_geom_idx      on picos using gist (geom);
create index picos_uf_idx        on picos (uf);
create index picos_municipio_idx on picos (municipio);

-- Feed do dia (efêmero; "acende" o pico)
create table feed_dia (
  id      bigint generated always as identity primary key,
  pico_id text not null references picos(id) on delete cascade,
  data    date not null,
  unique (pico_id, data)
);

-- Fotos (conteúdo nobre + procedência anti-fake + maré sobreposta)
create table fotos (
  id             uuid primary key default gen_random_uuid(),
  pico_id        text not null references picos(id) on delete cascade,
  feed_dia_id    bigint references feed_dia(id) on delete set null,
  autor_id       uuid references perfis(id) on delete set null,
  capturada_em   timestamptz not null,
  storage_path   text,                              -- caminho no Storage
  altura_mare_m  numeric(4,2),
  vento_tipo     text check (vento_tipo in ('terral','maral','lateral','calmo')),
  observacao     text,
  procedencia    text not null default 'nao-verificado'
                   check (procedencia in ('no-local','galeria','nao-verificado')),
  rostos_borrados boolean not null default false,
  geofence_ok    boolean not null default false,
  criada_em      timestamptz not null default now()
);
create index fotos_pico_data_idx on fotos (pico_id, capturada_em desc);

-- Ameaças costeiras (com proteção do denunciante)
create table ameacas (
  id             uuid primary key default gen_random_uuid(),
  titulo         text not null,
  categoria      text not null
                   check (categoria in ('poluicao','agua','erosao','privatizacao','obra','outro')),
  status         text not null default 'identificado'
                   check (status in ('identificado','em-observacao','recorrente','resolvido')),
  pico_id        text references picos(id) on delete set null,
  geom           geometry(Point, 4326),             -- precisão fina (RESTRITA)
  geom_aprox     geometry(Point, 4326),             -- grosseira (pública)
  municipio      text,
  uf             char(2),
  precisao       text not null default 'aproximada' check (precisao in ('exata','aproximada')),
  denunciante_id uuid references perfis(id) on delete set null,
  anonima        boolean not null default true,
  descricao      text,
  criada_em      timestamptz not null default now()
);
create index ameacas_geom_aprox_idx on ameacas using gist (geom_aprox);

-- ─────────────────────────────────────────────────────────────────────────
-- Derivação de UF/município por PostGIS (carregar a malha do IBGE):
--
--   create table malha_municipios (
--     cd_mun text primary key, nm_mun text, sigla_uf char(2),
--     geom geometry(MultiPolygon, 4326)
--   );
--   create index on malha_municipios using gist (geom);
--
-- Pico na água pode cair FORA do polígono → usar vizinho mais próximo:
--
--   create or replace function preencher_local() returns trigger as $$
--   begin
--     select m.nm_mun, m.sigla_uf into new.municipio, new.uf
--     from malha_municipios m
--     order by m.geom <-> new.geom
--     limit 1;
--     return new;
--   end; $$ language plpgsql;
--
--   create trigger picos_local before insert or update of geom on picos
--     for each row execute function preencher_local();
-- ─────────────────────────────────────────────────────────────────────────

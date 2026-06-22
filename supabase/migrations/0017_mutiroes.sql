-- Mutirões — mobilização da comunidade (limpeza, restinga, ação de praia).
-- Diferente da ameaça: aqui o local é PÚBLICO e EXATO (a meta é juntar gente).
-- Vira camada (verde) no mapa, ao lado de picos (azul) e ameaças (índigo).

create table mutiroes (
  id             text primary key,                 -- slug: "limpeza-praia-do-sonho"
  titulo         text not null,
  pico_id        text references picos(id) on delete set null,
  geom           extensions.geometry(Point, 4326) not null,   -- local exato (público)
  municipio      text,
  uf             char(2),
  quando         timestamptz not null,             -- início do mutirão
  horario        text,                             -- janela legível: "8h às 11h"
  organizador    text,
  organizador_id uuid references perfis(id) on delete set null,
  inscritos      int,
  vagas          int,
  status         text not null default 'agendado'
                   check (status in ('agendado','realizado','cancelado')),
  descricao      text,
  criado_em      timestamptz not null default now()
);
create index mutiroes_geom_idx   on mutiroes using gist (geom);
create index mutiroes_quando_idx on mutiroes (quando);

alter table mutiroes enable row level security;

-- Leitura pública (mobilização aberta); cancelados ficam fora.
create policy mutiroes_leitura on mutiroes
  for select using (status <> 'cancelado');
-- Criação por usuário autenticado, como organizador.
create policy mutiroes_insercao on mutiroes
  for insert with check (auth.uid() = organizador_id);

-- Read-model: lat/lng resolvidos (em vez de geometry crua).
create view mutiroes_publicos with (security_invoker = true) as
  select id, titulo, pico_id, municipio, uf, quando, horario, organizador,
         inscritos, vagas, status, descricao,
         extensions.ST_Y(geom) as lat, extensions.ST_X(geom) as lng
  from mutiroes
  where status <> 'cancelado';
grant select on mutiroes_publicos to anon, authenticated;

insert into mutiroes (id, titulo, pico_id, geom, municipio, uf, quando, horario, organizador, inscritos, vagas, status, descricao) values
  ('limpeza-praia-do-sonho','Limpeza Praia do Sonho','praia-do-sonho',
    extensions.ST_SetSRID(extensions.ST_MakePoint(-46.7625,-24.1735),4326),'Itanhaém','SP',
    '2026-06-27T08:00:00-03:00','8h às 11h','Coletivo Sentinela do Litoral',31,null,'agendado',
    'Mutirão de limpeza no canto sul, foco nos resíduos pós-ressaca.'),
  ('mutirao-pescadores','Mutirão Praia dos Pescadores','praia-dos-pescadores',
    extensions.ST_SetSRID(extensions.ST_MakePoint(-46.7889,-24.1882),4326),'Itanhaém','SP',
    '2026-06-27T08:00:00-03:00','8h às 11h',null,46,null,'agendado',
    'Limpeza da faixa de areia e da foz, com pesagem dos resíduos.'),
  ('restinga-viva','Restinga Viva',null,
    extensions.ST_SetSRID(extensions.ST_MakePoint(-46.9988,-24.3201),4326),'Peruíbe','SP',
    '2026-06-28T08:30:00-03:00','domingo de manhã','Restinga Viva',null,22,'agendado',
    'Recuperação da duna frontal e plantio de restinga (APP).')
on conflict (id) do nothing;

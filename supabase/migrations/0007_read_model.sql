-- Read-model para o cliente: expõe lat/lng (em vez de geometry crua) e
-- semeia ameaças de exemplo (coarse/anônimas, protegendo denunciante).

create or replace view picos_publicos with (security_invoker = true) as
  select id, nome, praia, regiao_surf_id, municipio, uf,
         orientacao_praia_deg, fundo, visibilidade, descricao,
         extensions.ST_Y(geom) as lat, extensions.ST_X(geom) as lng
  from picos
  where visibilidade = 'publico';
grant select on picos_publicos to anon, authenticated;

drop view if exists ameacas_publicas;
create view ameacas_publicas with (security_invoker = true) as
  select id, titulo, categoria, status, pico_id, municipio, uf, precisao, descricao, criada_em,
         extensions.ST_Y(geom_aprox) as lat, extensions.ST_X(geom_aprox) as lng
  from ameacas;
grant select on ameacas_publicas to anon, authenticated;

insert into ameacas (titulo, categoria, status, pico_id, geom_aprox, municipio, uf, precisao, anonima, descricao) values
  ('Resíduos acumulados no canto sul', 'poluicao', 'identificado', 'praia-do-sonho',
   extensions.ST_SetSRID(extensions.ST_MakePoint(-46.762, -24.174), 4326), 'Itanhaém', 'SP', 'aproximada', true,
   'Acúmulo recorrente após ressaca e maré de sizígia.'),
  ('Água com alteração visual', 'agua', 'em-observacao', 'praia-dos-pescadores',
   extensions.ST_SetSRID(extensions.ST_MakePoint(-46.789, -24.188), 4326), 'Itanhaém', 'SP', 'aproximada', true,
   'Coloração e espuma próximas à foz; investigar lançamento.'),
  ('Erosão na duna frontal', 'erosao', 'recorrente', null,
   extensions.ST_SetSRID(extensions.ST_MakePoint(-46.999, -24.320), 4326), 'Peruíbe', 'SP', 'aproximada', true,
   'Recuo da linha de vegetação de restinga (APP).');

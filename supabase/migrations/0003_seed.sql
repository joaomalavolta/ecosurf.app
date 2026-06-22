-- Seed do litoral de largada (Itanhaém / Litoral Sul de SP).
-- Coordenadas APROXIMADAS — confirmar com a comunidade local antes de publicar.

insert into regioes_surf (id, nome, uf) values
  ('litoral-sul-sp', 'Litoral Sul de SP', 'SP'),
  ('baixada-santista', 'Baixada Santista', 'SP')
on conflict (id) do nothing;

insert into picos (id, nome, praia, regiao_surf_id, geom, municipio, uf, orientacao_praia_deg, fundo, visibilidade, descricao) values
  ('praia-do-sonho', 'Praia do Sonho', 'Praia do Sonho', 'litoral-sul-sp',
   extensions.ST_SetSRID(extensions.ST_MakePoint(-46.7625, -24.1735), 4326),
   'Itanhaém', 'SP', 140, 'areia', 'publico',
   'Beach break de areia, pega bem com swell de S/SE e terral de manhã.'),
  ('praia-dos-pescadores', 'Praia dos Pescadores', 'Praia dos Pescadores', 'litoral-sul-sp',
   extensions.ST_SetSRID(extensions.ST_MakePoint(-46.7889, -24.1882), 4326),
   'Itanhaém', 'SP', 150, 'misto', 'publico',
   'Perto do morro e da foz; fundo misto, sensível ao vento lateral.'),
  ('cibratel-ii', 'Cibratel II', 'Praia de Cibratel', 'litoral-sul-sp',
   extensions.ST_SetSRID(extensions.ST_MakePoint(-46.7906, -24.2103), 4326),
   'Itanhaém', 'SP', 135, 'areia', 'publico',
   'Extensão longa de areia, várias bancadas conforme o banco do dia.'),
  ('praia-de-peruibe', 'Centro de Peruíbe', 'Praia do Centro', 'litoral-sul-sp',
   extensions.ST_SetSRID(extensions.ST_MakePoint(-46.9988, -24.3201), 4326),
   'Peruíbe', 'SP', 145, 'areia', 'publico',
   'Beach break exposto; restinga e APP no entorno.')
on conflict (id) do nothing;

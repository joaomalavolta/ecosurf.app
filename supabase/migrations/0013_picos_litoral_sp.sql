-- Picos do litoral paulista (âncora por cidade nas 3 regiões).
-- ⚠️ Coordenadas/orientações APROXIMADAS (nível município/praia conhecida) —
-- refinar com a comunidade local (nomes reais dos picos, fundo, abafamento).

insert into regioes_surf (id, nome, uf) values
  ('litoral-norte-sp', 'Litoral Norte de SP', 'SP')
on conflict (id) do nothing;

-- (litoral-sul-sp e baixada-santista já existem do seed inicial)

insert into picos (id, nome, praia, regiao_surf_id, geom, municipio, uf, orientacao_praia_deg, fundo, visibilidade, descricao) values
  -- Litoral Norte
  ('ubatuba-itamambuca','Itamambuca','Praia de Itamambuca','litoral-norte-sp', extensions.ST_SetSRID(extensions.ST_MakePoint(-45.031,-23.397),4326),'Ubatuba','SP',110,'areia','publico','Point clássico de Ubatuba.'),
  ('caraguatatuba-martim-de-sa','Martim de Sá','Praia Martim de Sá','litoral-norte-sp', extensions.ST_SetSRID(extensions.ST_MakePoint(-45.398,-23.617),4326),'Caraguatatuba','SP',130,'areia','publico',null),
  ('ilhabela-curral','Praia do Curral','Praia do Curral','litoral-norte-sp', extensions.ST_SetSRID(extensions.ST_MakePoint(-45.366,-23.829),4326),'Ilhabela','SP',150,'areia','publico',null),
  ('sao-sebastiao-maresias','Maresias','Praia de Maresias','litoral-norte-sp', extensions.ST_SetSRID(extensions.ST_MakePoint(-45.571,-23.790),4326),'São Sebastião','SP',150,'areia','publico','Uma das praias mais conhecidas do surf paulista.'),
  -- Baixada Santista (Litoral Central)
  ('bertioga-enseada','Enseada de Bertioga','Praia da Enseada','baixada-santista', extensions.ST_SetSRID(extensions.ST_MakePoint(-46.139,-23.854),4326),'Bertioga','SP',150,'areia','publico',null),
  ('guaruja-tombo','Praia do Tombo','Praia do Tombo','baixada-santista', extensions.ST_SetSRID(extensions.ST_MakePoint(-46.272,-24.012),4326),'Guarujá','SP',150,'areia','publico','Reduto de surf no Guarujá.'),
  ('santos-jose-menino','José Menino','Praia do José Menino','baixada-santista', extensions.ST_SetSRID(extensions.ST_MakePoint(-46.346,-23.985),4326),'Santos','SP',160,'areia','publico',null),
  ('sao-vicente-itarare','Itararé','Praia do Itararé','baixada-santista', extensions.ST_SetSRID(extensions.ST_MakePoint(-46.388,-23.963),4326),'São Vicente','SP',160,'areia','publico',null),
  ('praia-grande-maracana','Maracanã','Praia do Maracanã','baixada-santista', extensions.ST_SetSRID(extensions.ST_MakePoint(-46.414,-24.013),4326),'Praia Grande','SP',155,'areia','publico',null),
  -- Litoral Sul
  ('mongagua-centro','Praia de Mongaguá','Praia Central','litoral-sul-sp', extensions.ST_SetSRID(extensions.ST_MakePoint(-46.620,-24.093),4326),'Mongaguá','SP',150,'areia','publico',null),
  ('iguape-barra-do-ribeira','Barra do Ribeira','Barra do Ribeira','litoral-sul-sp', extensions.ST_SetSRID(extensions.ST_MakePoint(-47.420,-24.648),4326),'Iguape','SP',140,'areia','publico',null),
  ('ilha-comprida','Ilha Comprida','Praia de Ilha Comprida','litoral-sul-sp', extensions.ST_SetSRID(extensions.ST_MakePoint(-47.520,-24.731),4326),'Ilha Comprida','SP',130,'areia','publico','Praia oceânica extensa e preservada.'),
  ('cananeia-centro','Cananéia','Cananéia (estuário)','litoral-sul-sp', extensions.ST_SetSRID(extensions.ST_MakePoint(-47.927,-25.015),4326),'Cananéia','SP',120,'misto','publico','Região estuarina; praias oceânicas na Ilha do Cardoso.')
on conflict (id) do nothing;

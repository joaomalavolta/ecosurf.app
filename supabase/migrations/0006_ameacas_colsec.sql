-- Proteção do denunciante por PRIVILÉGIO DE COLUNA (mais robusto que a view
-- security-definer): anon/authenticated nunca leem geom exata nem denunciante_id.
drop view if exists ameacas_publicas;

revoke select on ameacas from anon, authenticated;
grant select (id, titulo, categoria, status, pico_id, geom_aprox, municipio, uf, precisao, descricao, criada_em)
  on ameacas to anon, authenticated;

-- leitura pública das linhas (as colunas sensíveis já estão fora do grant)
create policy ameacas_leitura_publica on ameacas
  for select using (true);

-- view curada, agora respeitando o usuário que consulta (security_invoker)
create view ameacas_publicas with (security_invoker = true) as
  select id, titulo, categoria, status, pico_id, geom_aprox, municipio, uf, precisao, descricao, criada_em
  from ameacas;
grant select on ameacas_publicas to anon, authenticated;

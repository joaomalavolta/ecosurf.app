-- Nome do autor no feed: leitura pública de nome/nível do perfil (atribuição
-- de autoria é pública por design), e view de fotos já com autor_nome.
create policy perfis_leitura_publica on perfis
  for select using (true);

create view fotos_publicas with (security_invoker = true) as
  select f.id, f.pico_id, f.capturada_em, f.storage_path, f.altura_mare_m,
         f.vento_tipo, f.observacao, f.procedencia,
         coalesce(p.nome, 'anônimo') as autor_nome
  from fotos f
  left join perfis p on p.id = f.autor_id;
grant select on fotos_publicas to anon, authenticated;

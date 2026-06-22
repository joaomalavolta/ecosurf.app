-- regioes_surf é dado de referência: leitura pública, escrita bloqueada.
alter table regioes_surf enable row level security;

create policy regioes_leitura_publica on regioes_surf
  for select using (true);

-- Ecosurf — Row Level Security
-- Princípios: pico abafado não vaza; geom exata de ameaça e identidade do
-- denunciante NUNCA são públicas (proteção de quem denuncia).

alter table picos     enable row level security;
alter table fotos     enable row level security;
alter table feed_dia  enable row level security;
alter table ameacas   enable row level security;
alter table perfis    enable row level security;

-- PICOS: público só enxerga os 'publico'. 'comunidade'/'abafado' ficam fora
-- do radar/mapa geral (soberania local sobre o pico).
create policy picos_leitura_publica on picos
  for select using (visibilidade = 'publico');

-- PERFIS: cada um administra o seu.
create policy perfis_self on perfis
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- FEED do dia: leitura pública apenas de picos públicos.
create policy feed_leitura on feed_dia
  for select using (
    exists (select 1 from picos p where p.id = feed_dia.pico_id and p.visibilidade = 'publico')
  );

-- FOTOS: leitura pública de picos públicos; inserção só do próprio autor autenticado.
create policy fotos_leitura on fotos
  for select using (
    exists (select 1 from picos p where p.id = fotos.pico_id and p.visibilidade = 'publico')
  );
create policy fotos_insercao on fotos
  for insert with check (auth.uid() = autor_id);

-- AMEAÇAS: acesso DIRETO à tabela é bloqueado para todos (tem geom exata e
-- denunciante). Inserção permitida a autenticado (como denunciante) ou anônima.
create policy ameacas_insercao on ameacas
  for insert with check (denunciante_id = auth.uid() or anonima = true);
-- (sem policy de SELECT ⇒ ninguém lê a tabela direto)

-- Exposição pública CURADA: só geom_aprox, sem geom exata, sem denunciante.
create view ameacas_publicas
  with (security_invoker = false) as
  select id, titulo, categoria, status, pico_id,
         geom_aprox, municipio, uf, precisao, descricao, criada_em
  from ameacas;

grant select on ameacas_publicas to anon, authenticated;

-- ⚠️ Revisar antes de produção:
--  - security_invoker=false faz a view rodar com permissão do dono (ignora a
--    RLS da tabela base de propósito) — confirme que nenhuma coluna sensível
--    (geom, denunciante_id) entra na projeção.
--  - moderadores/veteranos por região precisarão de policies próprias
--    (ex.: role 'moderador' lê geom exata só da sua região).

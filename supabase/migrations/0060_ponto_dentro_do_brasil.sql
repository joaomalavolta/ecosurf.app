-- 0060 — Um mutirão de Tramandaí estava plotado no mar da Argentina
--
-- Achado ao responder "o Rio Grande do Sul não tem registros?". Tem: dois
-- picos em Tramandaí (um com 2 fotos), uma comunidade e um mutirão. O mutirão
-- é que não aparecia — "Limpeza de Praia Tramandaí", município Tramandaí/RS,
-- gravado em lat -37.5196, lng -57.1792. Isso fica no Atlântico ao largo de
-- Mar del Plata, a 1.058 km do lugar.
--
-- A intenção do organizador não deixa dúvida: o ponto de encontro escrito por
-- ele é "Beira da praia, ao lado do píer, em frente ao Ondas do Sul". O píer
-- de Tramandaí é exatamente onde está o pico `plataforma-de-tramandai`, então
-- é para lá que o ponto volta.
--
-- Efeito colateral do erro, e o motivo de ele ter passado meses despercebido:
-- quem abrisse o mapa em Tramandaí via a região mais vazia do que ela é. O
-- convite "ninguém mapeou nada por aqui" teria aparecido com um mutirão
-- cadastrado ali — o app mentindo com convicção.
--
-- ── Por que nada barrou ────────────────────────────────────────────────────
--
-- Nada validava a coordenada. O seletor de local começa em São Paulo quando
-- não há GPS, e num mapa afastado um toque de poucos pixels vale centenas de
-- quilômetros. A busca por endereço também deixa passar: ela filtra por
-- `country === 'Brasil'`, mas aceita resultado SEM país declarado — e ponto no
-- mar costuma vir sem país.
--
-- ── O que este arquivo faz ─────────────────────────────────────────────────
--
-- Uma caixa. O Brasil cabe, com folga, em lat [-34, 6] e lng [-74, -34];
-- qualquer ponto fora disso é erro de entrada, não uma praia distante.
--
-- Não é o recorte exato do país — a caixa inclui pedaços de vizinhos e de mar
-- aberto. É de propósito: um teste barato que pega o erro grosseiro (o dedo
-- que escorregou num mapa afastado) sem precisar carregar a malha do IBGE
-- para dentro do banco, e sem risco de recusar uma praia legítima na fronteira.
--
-- ⚠️ NÃO serve para "está no litoral". Alerta em rio, no interior, é legítimo
-- e continua passando — vários dos que existem hoje são exatamente isso.
--
-- Conferido em teste com rollback antes de aplicar: nenhuma linha existente é
-- recusada depois da correção, escrita legítima passa e o ponto da Argentina
-- é barrado.

-- O ponto do píer de Tramandaí — o mesmo do pico `plataforma-de-tramandai`.
update public.mutiroes
   set geom = extensions.st_setsrid(
     extensions.st_makepoint(-50.1317834238315, -30.0035375626846), 4326)
 where id = '8248733e-736a-4e60-b7a9-fc7d11ff0d72'
   and extensions.st_x(geom) < -55;  -- só se ainda estiver errado (idempotente)

alter table public.picos    drop constraint if exists picos_dentro_do_brasil;
alter table public.ameacas  drop constraint if exists ameacas_dentro_do_brasil;
alter table public.mutiroes drop constraint if exists mutiroes_dentro_do_brasil;

alter table public.picos add constraint picos_dentro_do_brasil
  check (extensions.st_x(geom) between -74 and -34
     and extensions.st_y(geom) between -34 and 6);

alter table public.ameacas add constraint ameacas_dentro_do_brasil
  check (extensions.st_x(geom) between -74 and -34
     and extensions.st_y(geom) between -34 and 6);

alter table public.mutiroes add constraint mutiroes_dentro_do_brasil
  check (extensions.st_x(geom) between -74 and -34
     and extensions.st_y(geom) between -34 and 6);

comment on constraint mutiroes_dentro_do_brasil on public.mutiroes is
  'Coordenada fora do Brasil é erro de entrada — ver migration 0060.';

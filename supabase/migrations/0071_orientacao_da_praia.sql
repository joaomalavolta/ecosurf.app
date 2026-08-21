-- 0071 — A orientação da praia pode não ser sabida
--
-- `classificarVento` sempre soube a conta certa: compara de onde o vento vem
-- com o lado do mar aberto e devolve terral, maral ou lateral. O que ela
-- recebia é que estava errado.
--
-- `orientacao_praia_deg` era NOT NULL, e o app gravava 180 fixo em todo pico
-- novo (services/supabase/rest.ts) porque o formulário nunca perguntou. Os 9
-- picos do banco tinham todos 180 — um único valor distinto na tabela inteira.
--
-- 180° quer dizer "a praia olha para o sul", ou seja: o app assumia que o
-- terral vem do norte em qualquer ponto do Brasil.
--
-- ── O tamanho do erro ─────────────────────────────────────────────────────
--
-- Em Tramandaí a costa corre nordeste-sudoeste e a praia olha para ~130°, não
-- 180°. Com as faixas da classificação (até 60° = terral, a partir de 120° =
-- maral), 50° de erro troca a categoria:
--
--   vento de NE → o app dizia "terral" (e a manchete virava "Clássico");
--                 na verdade é lateral.
--   vento de O  → o app dizia "lateral";
--                 na verdade é o terral daquela praia.
--
-- Errava para os dois lados: prometia sessão clássica onde não havia, e
-- escondia a condição boa quando ela existia.
--
-- ── Por que NOT NULL era o problema de fundo ──────────────────────────────
--
-- Com NOT NULL e default, "ninguém mediu" e "medido, dá sul" eram a mesma
-- linha no banco. O app não tinha como se calar, porque não tinha como saber
-- que não sabia. Um palpite silencioso é pior do que uma lacuna assumida.
--
-- Daqui em diante NULL significa "não sei", e o app exibe só o que é medido
-- (altura, período, vento em km/h e ponto cardeal) até alguém preencher.
--
-- ── Procedência junto com o número ────────────────────────────────────────
--
-- `orientacao_fonte` diz de onde veio: 'osm' (calculado da linha de costa do
-- OpenStreetMap, ver lib/costa.ts) ou 'manual' (alguém apontou a bússola no
-- cadastro do pico). Sem isso repetiríamos o bug numa versão mais discreta:
-- um número na tabela sem ninguém saber se é medida ou default.
--
-- O CHECK de pareamento é o que sustenta a regra — ou os dois existem, ou
-- nenhum. E o grau vive em [0, 360): 360 é o mesmo que 0, e aceitar os dois
-- deixaria a normalização espalhada por quem lê.
--
-- ── Os 9 atuais voltam a NULL ─────────────────────────────────────────────
--
-- O 180 deles não é uma medição de que discordamos: é o default que o app
-- gravava sem perguntar. Mantê-lo seria carimbar de "conhecido" um número que
-- ninguém escolheu.
--
-- Conferido em teste com rollback contra os dados reais: 8 asserções. A
-- primeira versão FALHOU — a constraint de pareamento entrava antes do UPDATE,
-- e as 9 linhas com 180 e fonte nula a violavam. Por isso a limpeza vem antes
-- de trancar.

alter table public.picos alter column orientacao_praia_deg drop not null;
alter table public.picos alter column orientacao_praia_deg drop default;

alter table public.picos
  add column if not exists orientacao_fonte text;

alter table public.picos drop constraint if exists picos_orientacao_fonte_check;
alter table public.picos add constraint picos_orientacao_fonte_check
  check (orientacao_fonte is null or orientacao_fonte in ('osm', 'manual'));

-- Limpar ANTES de trancar: ver o teste que falhou, acima.
update public.picos
   set orientacao_praia_deg = null, orientacao_fonte = null
 where orientacao_fonte is null;

alter table public.picos drop constraint if exists picos_orientacao_deg_check;
alter table public.picos add constraint picos_orientacao_deg_check
  check (orientacao_praia_deg is null
         or (orientacao_praia_deg >= 0 and orientacao_praia_deg < 360));

alter table public.picos drop constraint if exists picos_orientacao_com_fonte;
alter table public.picos add constraint picos_orientacao_com_fonte
  check ((orientacao_praia_deg is null) = (orientacao_fonte is null));

comment on column public.picos.orientacao_praia_deg is
  'Direcao do mar aberto em graus (0 = norte, 90 = leste). NULL = nao sabido, '
  'e nesse caso o app nao diz terral/maral — ver migration 0071.';

comment on column public.picos.orientacao_fonte is
  'De onde veio a orientacao: osm (linha de costa do OpenStreetMap) ou manual '
  '(bussola no cadastro). Sempre presente quando ha grau, sempre ausente quando nao ha.';

-- A view precisa entregar a procedência junto com o grau: `restPicos` lê
-- `select=*` daqui, e sem a coluna o app receberia a orientação sem saber se
-- ela veio da linha de costa ou da mão de alguém.
--
-- `orientacao_fonte` entra NO FIM, e não ao lado de `orientacao_praia_deg`
-- onde seria mais legível: `create or replace view` só sabe acrescentar
-- colunas no fim da lista. Pôr no meio renomearia as colunas seguintes e o
-- Postgres recusa (42P16). Derrubar e recriar a view resolveria a estética
-- ao custo de perder os grants — não vale a troca.
--
-- ── ACHADO À PARTE, DE PROPÓSITO NÃO CORRIGIDO AQUI ───────────────────────
--
-- Esta view perdeu o `security_invoker = true` que a 0007 lhe deu: a 0034 a
-- substituiu sem a cláusula `with`, e `create or replace view` sem `with`
-- APAGA as opções em silêncio. Conferido em teste com rollback: antes
-- {security_invoker=true}, depois nulo. Ou seja, `picos_publicos` roda como
-- dona desde a 0034 e não aplica a RLS de `picos`.
--
-- Na prática hoje isso não expõe nada: o portão público é o próprio
-- `where visibilidade = 'publico'` daqui, e `picos_leitura_publica` é
-- `using (true)` para PUBLIC — a RLS não esconderia nada a mais. Mas é uma
-- diferença entre o que a 0007 quis e o que está valendo.
--
-- Não é assunto desta migration, e restaurar mexeria na leitura pública de
-- todo mundo — a 0069 mostrou como esse tipo de troca derruba o mapa inteiro
-- quando um papel não tem EXECUTE numa função do predicado. Fica anotado para
-- ser decidido em separado. Este `create or replace` também omite o `with`, o
-- que MANTÉM o estado atual: nada muda nesse eixo.
create or replace view public.picos_publicos as
  select id, nome, praia, regiao_surf_id, municipio, uf,
         orientacao_praia_deg,
         fundo, visibilidade, descricao,
         extensions.st_y(geom) as lat,
         extensions.st_x(geom) as lng,
         criado_por,
         orientacao_fonte
    from public.picos
   where visibilidade = 'publico';

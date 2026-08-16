-- 0058 — Faxina de policies: duplicatas, órfãs e uma armadilha de privacidade
--
-- Varredura do dia: os advisors de performance apontaram 22 casos de
-- "multiple permissive policies". A maioria é legítima — policy de autor OR
-- policy de staff é justamente como se escreve permissão no Postgres. Mas o
-- pente fino achou três coisas que não são desenho, são acúmulo.
--
-- ── 1. Policies órfãs: existem no banco e em NENHUMA migration ────────────
--
-- `ameacas_insert` e `mutiroes_insert` não aparecem em nenhum arquivo de
-- supabase/migrations. Foram criadas fora do fluxo (painel, provavelmente no
-- começo do projeto) e ficaram. `mutiroes_insert` é cópia idêntica de
-- `mutiroes_insercao` — some sem deixar saudade.
--
-- `ameacas_insert` é pior: role `public`, sem a checagem de sessão anônima
-- que a `ameacas_insercao` tem. Como policies permissivas são combinadas em
-- OR, a mais frouxa é a que vale — ou seja, a checagem cuidadosa da 0011
-- estava anulada por uma policy que ninguém sabia que existia. Hoje isso não
-- vaza nada porque a RESTRICTIVE `sem_anonimo` da 0053 veta por cima, mas era
-- a segunda linha de defesa fazendo o trabalho da primeira, em silêncio.
--
-- `mutiroes_insercao` sobe para `authenticated` + nao_anonimo() no mesmo
-- movimento, para ficar simétrica com a de ameacas em vez de depender só do
-- veto global.
--
-- ── 2. Policies de SELECT que nunca podem mudar a resposta ────────────────
--
-- Em ameacas, fotos, mutiroes e picos existe uma policy de leitura pública
-- USING (true) para `public`. Ao lado dela, policies de autor e de staff para
-- as MESMAS tabela+comando. Um OR com `true` é `true`: essas policies não
-- conseguem liberar nada que já não esteja liberado. Não são rede de
-- segurança, são uma avaliação por linha que não altera resultado — e essas
-- são exatamente as tabelas lidas no mapa e no radar a cada visita.
--
-- Verificado antes de aplicar, em teste com rollback: as 12 combinações
-- (anon, comum, staff) × (ameacas, fotos, mutiroes, picos) devolvem contagem
-- idêntica com e sem estas policies.
--
-- ⚠️ Se um dia a leitura pública for restringida, estas precisam VOLTAR — é
-- delas que autor e staff dependeriam. Estão preservadas aqui no arquivo.
--
-- ── 3. `ameacas.anonima` promete o que o banco não entrega ────────────────
--
-- Ver o bloco no fim.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Órfãs e duplicatas
-- ─────────────────────────────────────────────────────────────────────────

drop policy if exists ameacas_insert  on public.ameacas;
drop policy if exists mutiroes_insert on public.mutiroes;

drop policy if exists mutiroes_insercao on public.mutiroes;
create policy mutiroes_insercao on public.mutiroes
  for insert to authenticated
  with check (organizador_id = (select auth.uid()) and public.nao_anonimo());

-- ─────────────────────────────────────────────────────────────────────────
-- 2. SELECTs ofuscados por uma leitura pública USING (true)
--
-- Para reverter, se a leitura pública for fechada:
--   create policy ameacas_author_select on ameacas for select to authenticated
--     using ((select auth.uid()) = denunciante_id);
--   create policy picos_admin_select    on picos    for select to authenticated
--     using (public.eh_staff());
--   -- as três de staff (ameacas, fotos, mutiroes) valiam para
--   -- moderator+admin+super_admin, e não existe função para esse conjunto:
--   -- `eh_staff()` cobre só admin+super_admin. Precisaria de uma irmã dela,
--   -- também SECURITY DEFINER — ver 0052 para o motivo de não ser um EXISTS
--   -- escrito à mão dentro da policy.
-- ─────────────────────────────────────────────────────────────────────────

drop policy if exists ameacas_author_select on public.ameacas;
drop policy if exists ameacas_staff_select  on public.ameacas;
drop policy if exists fotos_staff_select    on public.fotos;
drop policy if exists mutiroes_staff_select on public.mutiroes;
drop policy if exists picos_admin_select    on public.picos;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. A armadilha da denúncia anônima
--
-- `ameacas.anonima` existe desde o começo e o gatilho de notificação da 0051
-- já a respeita (não credita o autor no aviso da comunidade). O problema é o
-- resto do caminho: `ameacas` tem grant de SELECT para `anon` e policy
-- USING (true), então QUALQUER pessoa com a chave pública lê a tabela inteira,
-- coluna `denunciante_id` incluída. Uma denúncia marcada como anônima seria
-- anônima só na tela.
--
-- Hoje ninguém está exposto: o cliente fixa `anonima: false` (alertas.ts) e
-- as 8 denúncias existentes são todas identificadas. É armadilha, não bug —
-- ela dispara no dia em que alguém ligar a opção na interface.
--
-- Mascarar o autor na view `ameacas_publicas` seria um remendo pior que nada:
-- daria ar de resolvido enquanto a tabela-base continua aberta ao lado. RLS é
-- por linha, não por coluna, então esconder só `denunciante_id` de quem lê a
-- base exige grant por coluna e uma revisão do que o app consulta.
--
-- Até lá, um CHECK transforma a armadilha em tropeço: quem tentar ligar a
-- denúncia anônima esbarra aqui, com o motivo escrito, em vez de descobrir
-- depois que o nome do denunciante estava público o tempo todo.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.ameacas drop constraint if exists ameacas_anonima_precisa_de_base_fechada;
alter table public.ameacas add constraint ameacas_anonima_precisa_de_base_fechada
  check (anonima is not true) not valid;

comment on constraint ameacas_anonima_precisa_de_base_fechada on public.ameacas is
  'Denúncia anônima só pode existir depois que a leitura da tabela ameacas '
  'parar de expor denunciante_id ao público (grant por coluna ou fim do '
  'USING(true)). Ver migration 0058.';

comment on column public.ameacas.anonima is
  'NÃO ligar sem antes fechar a leitura pública de denunciante_id — a coluna '
  'só esconde o autor na interface. Ver constraint '
  'ameacas_anonima_precisa_de_base_fechada e a migration 0058.';

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Índices de chave estrangeira que faltavam (advisor, nível INFO)
--
-- Tabelas criadas hoje. Com 19 pessoas não muda nada agora; a diferença
-- aparece quando `notificacoes` crescer e alguém apagar um perfil — sem
-- índice, o Postgres varre a tabela inteira para conferir a referência.
-- ─────────────────────────────────────────────────────────────────────────

create index if not exists denuncias_alvo_idx        on public.denuncias (alvo_id);
create index if not exists denuncias_conversa_idx    on public.denuncias (conversa_id);
create index if not exists denuncias_resolvida_idx   on public.denuncias (resolvida_por);
create index if not exists notificacoes_ator_idx     on public.notificacoes (ator_id);

-- 0069 — A moderação passa a ter efeito no que o público vê
--
-- O relato era "a moderação não esconde nada". Investigando, são TRÊS falhas
-- empilhadas, e a de baixo explica as outras.
--
-- ── 1. O painel oferece status que o banco recusa ─────────────────────────
--
-- O CHECK aceita quatro valores:
--
--     identificado · em-observacao · recorrente · resolvido
--
-- O seletor do painel oferece dez — esses quatro mais `publicado`,
-- `em-revisao`, `validado`, `sinalizado`, `ocultado` e `removido`. Escolher
-- qualquer um dos seis últimos faz o UPDATE voltar 23514.
--
-- ── 2. E a tela mente que deu certo ───────────────────────────────────────
--
-- `atualizarStatusAmeaca` não olhava `.error`, e a UI pintava a linha ANTES
-- do await. O moderador escolhia "ocultado", via "ocultado" na tabela, o banco
-- recusava, e um log era gravado dizendo que mudou. Recarregar desfazia tudo.
-- (Corrigido no lado do app, junto desta migration.)
--
-- ── 3. Nenhuma view pública filtra visibilidade ───────────────────────────
--
-- `ameacas` era a única entidade sem porteiro:
--
--     fotos_publicas     deleted_at is null and status='aprovada' and not oculta
--     mutiroes_publicos  status <> 'cancelado' and not rascunho
--     picos_publicos     visibilidade = 'publico'
--     ameacas_publicas   ← nada
--
-- ── A causa raiz: dois eixos numa coluna só ───────────────────────────────
--
-- `identificado → em-observacao → recorrente → resolvido` é o CICLO DE VIDA da
-- ocorrência. `ocultado`/`removido` é VISIBILIDADE. São perpendiculares: uma
-- ocorrência pode ser recorrente E estar oculta. Espremidos na mesma coluna,
-- esconder apaga que ela era recorrente — e reexibir não sabe para onde voltar.
--
-- Por isso a correção não é alargar o CHECK: é separar os eixos, como `fotos`
-- já faz (`status` + `oculta` + `deleted_at`). Coluna nova com default é
-- aditivo: as 11 ocorrências nascem `visivel`, que é o que elas são.
--
-- ── Onde o filtro mora: na RLS, e só nela ─────────────────────────────────
--
-- A primeira versão punha o mesmo predicado na policy E no `where` da view. O
-- teste derrubou: `anon` não tem EXECUTE em `eh_staff()` (a 0059 restringiu de
-- propósito), e a view é `security_invoker`, então a chamada acontece como
-- anon e volta `permission denied` — derrubando a leitura pública INTEIRA, não
-- só a dos escondidos. O mapa ficaria vazio para quem não está logado.
--
-- Sendo a view `security_invoker`, a RLS da tabela-base já filtra o que passa
-- por ela. O `where` seria, na melhor das hipóteses, um segundo predicado para
-- manter em sincronia com o primeiro. Fica um só.
--
-- E a policy se divide por papel, para `eh_staff()` nunca ser avaliada como
-- anon: `or` em SQL não garante curto-circuito, então não bastaria a ordem.
--
-- ── Escondido do público, não do dono ─────────────────────────────────────
--
-- O autor continua enxergando o próprio registro e a moderação enxerga tudo.
-- Um registro que some sem rastro nem para quem o criou é indistinguível de
-- perda de dado: a pessoa reenviaria, e a moderação teria o mesmo trabalho de
-- novo.
--
-- Conferido em teste com rollback: anon e terceiro logado não veem oculto nem
-- removido, nem pela view nem pela tabela-base; autor e moderação veem; o
-- ciclo de vida (inclusive `resolvido`) segue público; reexibir devolve ao ar
-- com o ciclo intacto; e o painel continua listando tudo.

alter table public.ameacas
  add column if not exists moderacao text not null default 'visivel';

alter table public.ameacas drop constraint if exists ameacas_moderacao_check;
alter table public.ameacas add constraint ameacas_moderacao_check
  check (moderacao in ('visivel', 'oculto', 'removido'));

comment on column public.ameacas.moderacao is
  'Visibilidade decidida pela moderacao: visivel | oculto | removido. Eixo '
  'SEPARADO de `status`, que e o ciclo de vida da ocorrencia — ver migration 0069.';

-- ── Leitura pública, dividida por papel ───────────────────────────────────
--
-- Duas policies permissivas em vez de uma: policies permissivas são OR-adas,
-- e cada uma só vale para o seu papel. Assim `eh_staff()` — que anon não pode
-- executar — nunca é avaliada numa sessão anônima.
drop policy if exists ameacas_leitura_publica on public.ameacas;
create policy ameacas_leitura_publica on public.ameacas
  for select to anon
  using (moderacao = 'visivel');

drop policy if exists ameacas_leitura_logado on public.ameacas;
create policy ameacas_leitura_logado on public.ameacas
  for select to authenticated
  using (
    moderacao = 'visivel'
    or public.eh_staff()
    or denunciante_id = (select auth.uid())
  );

-- ── A view NÃO repete o filtro ────────────────────────────────────────────
--
-- `security_invoker = true` faz a RLS acima valer aqui dentro. A única
-- mudança é expor `moderacao`, para o painel saber o que está escondido.
create or replace view public.ameacas_publicas as
  select a.id, a.titulo, a.categoria, a.status, a.gravidade, a.pico_id,
         a.municipio, a.uf, a.precisao, a.descricao, a.criada_em, a.local_nome,
         a.recorrente, a.images,
         extensions.st_y(coalesce(a.geom_aprox, a.geom)) as lat,
         extensions.st_x(coalesce(a.geom_aprox, a.geom)) as lng,
         a.denunciante_id as autor_id,
         p.nome as autor_nome,
         p.foto_url as autor_foto,
         a.comunidade_id,
         c.nome as comunidade_nome,
         c.avatar_url as comunidade_avatar,
         a.ocorrido_em,
         a.tipo_registro,
         a.moderacao
    from public.ameacas a
    left join public.perfis p on p.id = a.denunciante_id
    left join public.comunidades c on c.id = a.comunidade_id and c.deleted_at is null;

alter view public.ameacas_publicas set (security_invoker = true);

-- O filtro cai sobre `moderacao` em toda leitura pública. Onze linhas não
-- pedem índice; alguns milhares pedem.
create index if not exists ameacas_moderacao_idx on public.ameacas (moderacao);

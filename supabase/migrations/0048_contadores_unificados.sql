-- 0048 — Os dois selos do cabeçalho numa requisição só
--
-- O cabeçalho aparece em toda tela: somar uma consulta por contador sairia
-- caro à toa. Esta view devolve os dois números de uma vez, e o Radar segue
-- com o mesmo custo de abertura de antes.
--
-- Substitui, na prática, o uso de `minhas_nao_lidas` e
-- `minhas_notificacoes_novas` pelo cliente — as duas continuam existindo,
-- úteis isoladamente e como documentação de cada conta.
create or replace view public.meus_contadores
with (security_invoker = on) as
select
  (select count(*)::int
     from public.mensagens m
     join public.conversa_participantes p
       on p.conversa_id = m.conversa_id and p.usuario_id = (select auth.uid())
    where m.autor_id <> (select auth.uid())
      and (p.lida_em is null or m.criada_em > p.lida_em)) as mensagens,
  (select count(*)::int
     from public.notificacoes n
    where n.usuario_id = (select auth.uid()) and n.lida_em is null) as notificacoes;

grant select on public.meus_contadores to authenticated;

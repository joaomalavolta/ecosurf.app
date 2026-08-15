-- 0043 — Selo de não-lidas sem carregar o SDK
--
-- O menu de conta lê identidade via PostgREST com fetch puro (para manter o
-- Radar leve). Um GET nesta view resolve o contador numa requisição pequena.
--
-- security_invoker: a RLS de mensagens continua valendo — a view não é uma
-- porta dos fundos, só empacota a conta de quem já podia ler.
create or replace view public.minhas_nao_lidas
with (security_invoker = on) as
select count(*)::int as total
  from public.mensagens m
  join public.conversa_participantes p
    on p.conversa_id = m.conversa_id
   and p.usuario_id = (select auth.uid())
 where m.autor_id <> (select auth.uid())
   and (p.lida_em is null or m.criada_em > p.lida_em);

grant select on public.minhas_nao_lidas to authenticated;

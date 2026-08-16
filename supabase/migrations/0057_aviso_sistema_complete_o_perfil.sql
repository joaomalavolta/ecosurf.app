-- 0057 — Aviso de sistema: "escolha seu nome"
--
-- Recado do próprio Ecosurf, não de outra pessoa. Os tipos existentes
-- descrevem coisas que alguém fez (mandou mensagem, entrou na comunidade,
-- publicou). Este é o app falando — e o app fala pouco, então o tipo nasce
-- com um uso só: pedir o nome a quem ficou sem, porque a gravação de perfil
-- esteve quebrada de 22/06 (migration 0017) até a correção de hoje (0052).
--
-- SEM PUSH de propósito. Nenhuma dessas 15 contas tem aparelho inscrito, e
-- mesmo que tivesse: mandar notificação para conta dormente é gastar o único
-- crédito de atenção que se tem. O aviso espera dentro do app, no sino.
alter table public.notificacoes drop constraint if exists notificacoes_tipo_check;
alter table public.notificacoes add constraint notificacoes_tipo_check
  check (tipo in ('mensagem', 'comunidade_membro', 'comunidade_publicacao', 'sistema'));

-- Um aviso por pessoa sem nome. `chave` fixa: se este comando rodar de novo,
-- atualiza o aviso em vez de empilhar um segundo.
insert into public.notificacoes (usuario_id, tipo, titulo, corpo, url, ator_id, chave, avisada_em)
select p.id,
       'sistema',
       'Escolha seu nome no Ecosurf',
       'Salvar o perfil estava com defeito e já foi corrigido. Toque para se apresentar à rede.',
       '/perfil',
       null,
       'sistema:complete-o-perfil',
       now()
  from public.perfis p
 where p.nome is null or btrim(p.nome) = ''
on conflict (usuario_id, chave) where lida_em is null and chave is not null
do update set titulo = excluded.titulo,
              corpo = excluded.corpo,
              url = excluded.url,
              criada_em = now();

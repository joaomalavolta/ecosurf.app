-- 0054 — Complemento indispensável da 0053
--
-- SECURITY DEFINER roda como dono da função e IGNORA RLS — é para isso que
-- serve. Então o veto anônimo, que é uma policy, não alcança nada que
-- aconteça dentro dessas funções: o teste da 0053 mostrou uma sessão anônima
-- abrindo conversa mesmo com a restritiva no lugar.
--
-- As que escrevem passam a checar na porta. As de leitura (eh_participante,
-- eh_staff, comunidade_criador, eh_admin_comunidade, pico_dentro_do_limite)
-- só respondem sobre quem pergunta e não criam nada — ficam como estão.
--
-- ⚠️ Padrão: SECURITY DEFINER que escreve precisa checar nao_anonimo() no
-- corpo. A policy restritiva não vai fazer isso por ela.

create or replace function public.abrir_conversa(p_outro uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  eu uuid := (select auth.uid());
  achada uuid;
  nova uuid;
begin
  if eu is null then
    raise exception 'Entre na sua conta para enviar mensagens.';
  end if;
  -- SECURITY DEFINER pula a RLS: o veto anônimo precisa estar aqui dentro.
  if not nao_anonimo() then
    raise exception 'Entre com e-mail, telefone ou Google para conversar.';
  end if;
  if p_outro is null or p_outro = eu then
    raise exception 'Escolha outra pessoa para conversar.';
  end if;
  if not exists (select 1 from perfis where id = p_outro) then
    raise exception 'Pessoa não encontrada.';
  end if;
  if ha_bloqueio(eu, p_outro) then
    raise exception 'Não é possível conversar com esta pessoa.';
  end if;

  select p1.conversa_id into achada
    from conversa_participantes p1
    join conversa_participantes p2 on p2.conversa_id = p1.conversa_id
   where p1.usuario_id = eu
     and p2.usuario_id = p_outro
     and (select count(*) from conversa_participantes p3 where p3.conversa_id = p1.conversa_id) = 2
   limit 1;

  if achada is not null then
    return achada;
  end if;

  insert into conversas default values returning id into nova;
  insert into conversa_participantes (conversa_id, usuario_id) values (nova, eu), (nova, p_outro);
  return nova;
end;
$$;

revoke execute on function public.abrir_conversa(uuid) from public, anon;
grant execute on function public.abrir_conversa(uuid) to authenticated;

create or replace function public.marcar_notificacoes_lidas(p_ids uuid[] default null)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare eu uuid := (select auth.uid()); n int;
begin
  if eu is null or not nao_anonimo() then return 0; end if;
  update notificacoes
     set lida_em = now()
   where usuario_id = eu
     and lida_em is null
     and (p_ids is null or id = any(p_ids));
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke execute on function public.marcar_notificacoes_lidas(uuid[]) from public, anon;
grant execute on function public.marcar_notificacoes_lidas(uuid[]) to authenticated;

-- 0055 — Última porta que a policy restritiva não alcança
--
-- Inscrição em mutirão também é SECURITY DEFINER. Mesmo motivo da 0054, e
-- descoberta depois dela: ao varrer as funções, esta ficou de fora da
-- primeira leva. Resto da função intacto.
create or replace function public.inscrever_mutirao(p_mutirao_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m record;
begin
  if auth.uid() is null then
    raise exception 'Entre na sua conta para participar.';
  end if;
  -- SECURITY DEFINER pula a RLS: o veto anônimo precisa estar aqui dentro.
  if not nao_anonimo() then
    raise exception 'Entre com e-mail, telefone ou Google para participar.';
  end if;

  select id, quando, status into m from mutiroes where id = p_mutirao_id;
  if not found then
    raise exception 'Mutirão não encontrado.';
  end if;

  if m.status <> 'agendado' then
    raise exception 'Este mutirão não está aberto para inscrições.';
  end if;

  if m.quando is not null
     and (m.quando at time zone 'America/Sao_Paulo')::date
         < (now() at time zone 'America/Sao_Paulo')::date then
    raise exception 'Este mutirão já aconteceu.';
  end if;

  insert into mutirao_participantes(mutirao_id, user_id)
  values (p_mutirao_id, auth.uid())
  on conflict (mutirao_id, user_id) do nothing;

  update mutiroes set inscritos = (
    select count(*) from mutirao_participantes where mutirao_id = p_mutirao_id
  ) where id = p_mutirao_id;
end;
$$;

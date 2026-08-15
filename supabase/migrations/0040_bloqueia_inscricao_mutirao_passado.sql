-- 0040 — Inscrição só em mutirão que ainda vai acontecer
--
-- A função aceitava qualquer data: mutirões de junho continuavam com o botão
-- "Quero participar" ativo em agosto. Agora exige sessão e recusa evento
-- encerrado ou fora do status 'agendado'.
--
-- Regra de "encerrado": o dia do evento no fuso de São Paulo já passou. Fica
-- aberto durante todo o próprio dia — `horario` é texto livre ("09:00 às
-- 12:00"), então não dá para cortar na hora exata, e seria ruim fechar a
-- inscrição no meio de um mutirão que ainda está rolando.
-- A mesma regra vive no app em src/lib/agenda.ts (acaoEncerrada).

create or replace function public.inscrever_mutirao(p_mutirao_id text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  m record;
begin
  if auth.uid() is null then
    raise exception 'Entre na sua conta para participar.';
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
$function$;

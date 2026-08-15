-- 0051 — Publicação da comunidade avisa quem segue, não só quem administra
--
-- Quem seguiu pediu para acompanhar — é a definição de seguir. Mas isso muda
-- a escala do aviso: de 2 ou 3 admins para a comunidade inteira. O laço de
-- notificar() por pessoa da 0046 viraria centenas de INSERTs e centenas de
-- chamadas HTTP dentro do gatilho que publica o alerta, e o alerta esperaria
-- por tudo antes de existir.
--
-- Por isso a versão em lote: um INSERT só para todo mundo, e o push agrupado
-- em blocos de 500 (o teto que a edge function aceita).
--
-- `admins_da_comunidade` continua existindo e em uso: membro novo segue sendo
-- assunto de quem administra, não da comunidade toda.

/** Quem acompanha a comunidade: todo mundo que é membro, mais o fundador. */
create or replace function public.publico_da_comunidade(p_comunidade uuid, p_exceto uuid)
returns uuid[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(distinct u), '{}')
    from (
      select m.usuario_id as u from membros_comunidade m
       where m.comunidade_id = p_comunidade
      union
      select c.criador_id from comunidades c where c.id = p_comunidade
    ) t
   where u is not null and u is distinct from p_exceto;
$$;

revoke execute on function public.publico_da_comunidade(uuid, uuid) from public, anon, authenticated;

/**
 * Avisa muita gente de uma vez.
 *
 * Um INSERT para todos (agrupando por chave, como o notificar() individual) e
 * o push em blocos. O `avisada_em` só é remarcado depois de 2 minutos, então o
 * freio continua valendo por pessoa — e só quem teve o carimbo renovado agora
 * entra no push, o que evita tocar de novo o celular de quem já foi avisado.
 */
create or replace function public.notificar_muitos(
  p_usuarios uuid[], p_tipo text, p_titulo text, p_corpo text, p_url text,
  p_ator uuid, p_chave text, p_assunto_push text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_push uuid[]; v_total int; i int; v_lote uuid[];
begin
  if p_usuarios is null or array_length(p_usuarios, 1) is null or p_chave is null then
    return;
  end if;

  begin
    with alvos as (
      -- distinct obrigatório: id repetido faria o ON CONFLICT tentar mexer
      -- duas vezes na mesma linha, e o Postgres recusa.
      select distinct u from unnest(p_usuarios) as u
       where u is not null and u is distinct from p_ator
    ),
    gravadas as (
      insert into notificacoes (usuario_id, tipo, titulo, corpo, url, ator_id, chave, avisada_em)
      select u, p_tipo, p_titulo, p_corpo, p_url, p_ator, p_chave, now() from alvos
      on conflict (usuario_id, chave) where lida_em is null and chave is not null
      do update set titulo = excluded.titulo,
                    corpo = excluded.corpo,
                    url = excluded.url,
                    ator_id = excluded.ator_id,
                    criada_em = now(),
                    avisada_em = case
                      when notificacoes.avisada_em is null
                        or notificacoes.avisada_em < now() - interval '2 minutes'
                      then now() else notificacoes.avisada_em end
      returning usuario_id, avisada_em
    )
    -- now() é constante na transação: avisada_em = now() marca exatamente
    -- quem teve o carimbo renovado agora, ou seja, quem deve receber push.
    select coalesce(array_agg(usuario_id) filter (where avisada_em = now()), '{}')
      into v_push from gravadas;
  exception when others then
    return;
  end;

  v_total := coalesce(array_length(v_push, 1), 0);
  i := 1;
  while i <= v_total loop
    v_lote := v_push[i : i + 499];
    begin
      perform push_notificar_usuarios(p_assunto_push, p_titulo, p_corpo, p_url, v_lote, p_chave);
    exception when others then null;
    end;
    i := i + 500;
  end loop;
end;
$$;

revoke execute on function public.notificar_muitos(uuid[],text,text,text,text,uuid,text,text)
  from public, anon, authenticated;

-- Alerta da comunidade → avisa quem segue (e quem administra).
create or replace function public.notif_alerta_comunidade()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_comunidade text; v_autor uuid;
begin
  begin
    if new.comunidade_id is null then return new; end if;
    v_autor := case when coalesce(new.anonima, false) then null else new.denunciante_id end;
    select nome into v_comunidade from comunidades where id = new.comunidade_id;

    perform notificar_muitos(
      publico_da_comunidade(new.comunidade_id, new.denunciante_id),
      'comunidade_publicacao',
      'Novo alerta em ' || coalesce(v_comunidade, 'uma comunidade que você segue'),
      coalesce(nullif(btrim(new.titulo), ''), 'Registro ambiental'),
      '/alerta/' || new.id,
      v_autor,
      'comunidade:' || new.comunidade_id || ':publicacoes',
      'comunidades'
    );
  exception when others then null;
  end;
  return new;
end;
$$;

revoke execute on function public.notif_alerta_comunidade() from public, anon, authenticated;

-- Mutirão da comunidade → idem. Rascunho continua não avisando.
create or replace function public.notif_mutirao_comunidade()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_comunidade text;
begin
  begin
    if new.comunidade_id is null or coalesce(new.rascunho, false) then return new; end if;
    select nome into v_comunidade from comunidades where id = new.comunidade_id;

    perform notificar_muitos(
      publico_da_comunidade(new.comunidade_id, new.organizador_id),
      'comunidade_publicacao',
      'Nova ação em ' || coalesce(v_comunidade, 'uma comunidade que você segue'),
      coalesce(nullif(btrim(new.titulo), ''), 'Mutirão') ||
        case when new.quando is not null
             then ' · ' || to_char(new.quando at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI')
             else '' end,
      '/mutirao/' || new.id,
      new.organizador_id,
      'comunidade:' || new.comunidade_id || ':publicacoes',
      'comunidades'
    );
  exception when others then null;
  end;
  return new;
end;
$$;

revoke execute on function public.notif_mutirao_comunidade() from public, anon, authenticated;

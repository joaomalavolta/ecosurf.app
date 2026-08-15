-- 0046 — Os gatilhos que alimentam a central
--
-- Todos engolem o próprio erro: avisar é secundário, e uma falha aqui não
-- pode impedir a mensagem de ser enviada nem o alerta de ser publicado.

/**
 * Mensagem nova → avisa o outro lado.
 *
 * O texto da mensagem NÃO entra no aviso. O payload do push viaja pelos
 * servidores da Apple e do Google; conversa privada não passa por lá.
 */
create or replace function public.notif_nova_mensagem()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_destino uuid; v_nome text;
begin
  begin
    select p.usuario_id into v_destino
      from conversa_participantes p
     where p.conversa_id = new.conversa_id and p.usuario_id <> new.autor_id
     limit 1;
    if v_destino is null then return new; end if;

    select coalesce(nullif(btrim(nome), ''), 'Alguém') into v_nome
      from perfis where id = new.autor_id;

    perform notificar(
      v_destino, 'mensagem',
      coalesce(v_nome, 'Alguém') || ' te mandou uma mensagem',
      'Toque para abrir a conversa.',
      '/mensagens/' || new.conversa_id,
      new.autor_id,
      'conversa:' || new.conversa_id,
      'mensagens'
    );
  exception when others then null;
  end;
  return new;
end;
$$;

drop trigger if exists trg_notif_nova_mensagem on public.mensagens;
create trigger trg_notif_nova_mensagem
  after insert on public.mensagens
  for each row execute function public.notif_nova_mensagem();

/** Quem administra a comunidade (fundador incluído), menos quem causou o evento. */
create or replace function public.admins_da_comunidade(p_comunidade uuid, p_exceto uuid)
returns uuid[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(distinct u), '{}')
    from (
      select m.usuario_id as u from membros_comunidade m
       where m.comunidade_id = p_comunidade and m.papel = 'admin'
      union
      select c.criador_id from comunidades c where c.id = p_comunidade
    ) t
   where u is not null and u is distinct from p_exceto;
$$;

revoke execute on function public.admins_da_comunidade(uuid, uuid) from public, anon, authenticated;

/** Membro novo → avisa quem administra. */
create or replace function public.notif_membro_comunidade()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_nome text; v_comunidade text; v_admin uuid;
begin
  begin
    select coalesce(nullif(btrim(nome), ''), 'Alguém') into v_nome from perfis where id = new.usuario_id;
    select nome into v_comunidade from comunidades where id = new.comunidade_id;

    foreach v_admin in array admins_da_comunidade(new.comunidade_id, new.usuario_id) loop
      perform notificar(
        v_admin, 'comunidade_membro',
        coalesce(v_nome, 'Alguém') || ' entrou em ' || coalesce(v_comunidade, 'sua comunidade'),
        'A comunidade cresceu.',
        '/comunidade/' || new.comunidade_id || '/membros',
        new.usuario_id,
        'comunidade:' || new.comunidade_id || ':membros',
        'comunidades'
      );
    end loop;
  exception when others then null;
  end;
  return new;
end;
$$;

drop trigger if exists trg_notif_membro_comunidade on public.membros_comunidade;
create trigger trg_notif_membro_comunidade
  after insert on public.membros_comunidade
  for each row execute function public.notif_membro_comunidade();

/** Alerta publicado pela comunidade → avisa quem administra. Anônimo continua anônimo. */
create or replace function public.notif_alerta_comunidade()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_comunidade text; v_admin uuid; v_autor uuid;
begin
  begin
    if new.comunidade_id is null then return new; end if;
    v_autor := case when coalesce(new.anonima, false) then null else new.denunciante_id end;
    select nome into v_comunidade from comunidades where id = new.comunidade_id;

    foreach v_admin in array admins_da_comunidade(new.comunidade_id, new.denunciante_id) loop
      perform notificar(
        v_admin, 'comunidade_publicacao',
        'Novo alerta em ' || coalesce(v_comunidade, 'sua comunidade'),
        coalesce(nullif(btrim(new.titulo), ''), 'Registro ambiental'),
        '/alerta/' || new.id,
        v_autor,
        'comunidade:' || new.comunidade_id || ':publicacoes',
        'comunidades'
      );
    end loop;
  exception when others then null;
  end;
  return new;
end;
$$;

drop trigger if exists trg_notif_alerta_comunidade on public.ameacas;
create trigger trg_notif_alerta_comunidade
  after insert on public.ameacas
  for each row execute function public.notif_alerta_comunidade();

/** Mutirão publicado pela comunidade → avisa quem administra. Rascunho não avisa. */
create or replace function public.notif_mutirao_comunidade()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_comunidade text; v_admin uuid;
begin
  begin
    if new.comunidade_id is null or coalesce(new.rascunho, false) then return new; end if;
    select nome into v_comunidade from comunidades where id = new.comunidade_id;

    foreach v_admin in array admins_da_comunidade(new.comunidade_id, new.organizador_id) loop
      perform notificar(
        v_admin, 'comunidade_publicacao',
        'Nova ação em ' || coalesce(v_comunidade, 'sua comunidade'),
        coalesce(nullif(btrim(new.titulo), ''), 'Mutirão') ||
          case when new.quando is not null
               then ' · ' || to_char(new.quando at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI')
               else '' end,
        '/mutirao/' || new.id,
        new.organizador_id,
        'comunidade:' || new.comunidade_id || ':publicacoes',
        'comunidades'
      );
    end loop;
  exception when others then null;
  end;
  return new;
end;
$$;

drop trigger if exists trg_notif_mutirao_comunidade on public.mutiroes;
create trigger trg_notif_mutirao_comunidade
  after insert on public.mutiroes
  for each row execute function public.notif_mutirao_comunidade();

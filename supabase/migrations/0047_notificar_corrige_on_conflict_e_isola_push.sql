-- 0047 — Conserta a notificar() da 0045: dois erros que só o teste revelou
--
-- O gatilho engolia a exceção (por bom motivo: avisar não pode derrubar a
-- mensagem), então o sintoma era mudo — nenhuma notificação, nenhum erro.
-- Só desligando a mordaça num teste apareceram os dois defeitos abaixo.

/**
 * Registra o aviso e, se for a hora, toca o celular.
 *
 * Duas correções sobre a primeira versão, ambas descobertas testando:
 *
 *  1. O `on conflict` precisa repetir o predicado INTEIRO do índice parcial
 *     (`lida_em is null AND chave is not null`). Só metade dele não infere o
 *     índice e o Postgres recusa com 42P10.
 *
 *  2. Gravar e avisar ficam em blocos SEPARADOS. Bloco de exceção em plpgsql
 *     é subtransação: com os dois juntos, uma falha do push desfazia também o
 *     registro do aviso — o histórico sumia junto com o toque no celular.
 */
create or replace function public.notificar(
  p_usuario uuid, p_tipo text, p_titulo text, p_corpo text, p_url text,
  p_ator uuid, p_chave text, p_assunto_push text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_avisar boolean := true; v_antes timestamptz;
begin
  if p_usuario is null or p_chave is null then return; end if;
  if p_ator is not null and p_usuario = p_ator then return; end if;

  select avisada_em into v_antes
    from notificacoes
   where usuario_id = p_usuario and chave = p_chave and lida_em is null
   limit 1;
  if v_antes is not null and v_antes > now() - interval '2 minutes' then
    v_avisar := false;
  end if;

  -- Gravar o histórico: se isto falhar, não há o que avisar.
  begin
    insert into notificacoes (usuario_id, tipo, titulo, corpo, url, ator_id, chave, avisada_em)
    values (p_usuario, p_tipo, p_titulo, p_corpo, p_url, p_ator, p_chave,
            case when v_avisar then now() else v_antes end)
    on conflict (usuario_id, chave) where lida_em is null and chave is not null
    do update set titulo = excluded.titulo,
                  corpo = excluded.corpo,
                  url = excluded.url,
                  ator_id = excluded.ator_id,
                  criada_em = now(),
                  avisada_em = excluded.avisada_em;
  exception when others then
    return;
  end;

  -- Tocar o celular: falhar aqui não pode custar o registro acima.
  if v_avisar then
    begin
      perform push_notificar_usuarios(p_assunto_push, p_titulo, p_corpo, p_url, array[p_usuario], p_chave);
    exception when others then null;
    end;
  end if;
end;
$$;

revoke execute on function public.notificar(uuid,text,text,text,text,uuid,text,text)
  from public, anon, authenticated;

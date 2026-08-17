-- 0066 — As notificações param de chamar tartaruga de alerta
--
-- Dois gatilhos anunciam registro novo, e os dois diziam "Novo alerta". Com
-- a 0063 na mesa, publicar "Filhotes avistados" mandaria para a comunidade
-- inteira um push dizendo que houve um alerta ambiental em Tramandaí.
--
-- ── De quebra, o push de alerta estava morto ──────────────────────────────
--
-- `push_novo_alerta` passava `new.autor_id` para `push_notificar`. A tabela
-- `ameacas` não tem essa coluna — o autor é `denunciante_id`. Em plpgsql o
-- campo é resolvido em tempo de execução, então isso levantava
-- `record "new" has no field "autor_id"` a cada INSERT... e o `exception when
-- others then null` logo abaixo engolia o erro em silêncio. Resultado: nenhum
-- push de alerta novo saiu desde que o gatilho existe, e nada apareceu em log
-- nenhum porque a exceção nunca chegou a lugar algum.
--
-- Corrigido aqui porque é a mesma linha que este arquivo já reescreve — o
-- quinto argumento é "quem não deve receber", que é o próprio autor.
--
-- ── Por que o texto não traz o nome da categoria ──────────────────────────
--
-- Traria "Novo alerta: lixo-praia" — o id cru, que já vazava para o push
-- antes. Um mapa id→rótulo em SQL seria a SEGUNDA fonte de verdade dos
-- rótulos (a primeira é `SeletorCategoria.tsx`), e as duas iam divergir. O
-- `titulo` do registro já começa com o rótulo, porque é assim que o
-- formulário o monta: "Fauna avistada — Tramandaí".

create or replace function public.push_novo_alerta()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_positivo boolean := coalesce(new.tipo_registro, 'alerta') = 'positivo';
begin
  begin
    perform public.push_notificar(
      'alertas',
      case when v_positivo then 'Novo registro positivo' else 'Novo alerta ambiental' end,
      coalesce(nullif(btrim(new.titulo), ''), case when v_positivo then 'Registro positivo' else 'Registro ambiental' end) ||
        case when new.municipio is not null then ' — ' || new.municipio || '/' || coalesce(new.uf, '') else '' end,
      '/alerta/' || new.id,
      new.denunciante_id
    );
  exception when others then null;
  end;
  return new;
end;
$$;

create or replace function public.notif_alerta_comunidade()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_comunidade text;
  v_autor uuid;
  v_positivo boolean := coalesce(new.tipo_registro, 'alerta') = 'positivo';
begin
  begin
    if new.comunidade_id is null then return new; end if;
    v_autor := case when coalesce(new.anonima, false) then null else new.denunciante_id end;
    select nome into v_comunidade from comunidades where id = new.comunidade_id;

    perform notificar_muitos(
      publico_da_comunidade(new.comunidade_id, new.denunciante_id),
      'comunidade_publicacao',
      case when v_positivo then 'Novo registro positivo em ' else 'Novo alerta em ' end
        || coalesce(v_comunidade, 'uma comunidade que você segue'),
      coalesce(nullif(btrim(new.titulo), ''),
               case when v_positivo then 'Registro positivo' else 'Registro ambiental' end),
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

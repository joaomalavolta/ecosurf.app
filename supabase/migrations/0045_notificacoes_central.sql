-- 0045 — Central de notificações: o histórico que o push não guarda
--
-- Push avisa na hora e some. Esta tabela é a memória: quem recusou push, quem
-- estava sem rede ou simplesmente não viu, encontra aqui o que aconteceu.
--
-- Duas regras de convivência embutidas:
--   • AGRUPA por `chave` — 20 mensagens numa conversa viram UM aviso que se
--     atualiza, não 20 linhas;
--   • FREIA o push por `avisada_em` — no máximo um toque a cada 2 minutos por
--     assunto, mesmo que cheguem 20 mensagens seguidas.
--
-- ⚠️ A função `notificar()` criada aqui nasceu com dois defeitos, corrigidos
-- pela 0047 (que é quem vale). Ficam registrados lá, com o porquê.

create table if not exists public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  tipo text not null check (tipo in ('mensagem', 'comunidade_membro', 'comunidade_publicacao')),
  titulo text not null,
  corpo text,
  url text,
  ator_id uuid references auth.users(id) on delete set null,
  -- Identificador do assunto ('conversa:<id>', 'comunidade:<id>'): enquanto
  -- não lida, a notificação do mesmo assunto é atualizada em vez de duplicada.
  chave text,
  avisada_em timestamptz,
  lida_em timestamptz,
  criada_em timestamptz not null default now()
);

create index if not exists idx_notificacoes_usuario
  on public.notificacoes (usuario_id, criada_em desc);

create unique index if not exists uniq_notificacao_aberta
  on public.notificacoes (usuario_id, chave)
  where lida_em is null and chave is not null;

alter table public.notificacoes enable row level security;

-- Só o dono lê. E só ele apaga (dispensar um aviso).
drop policy if exists notificacoes_minhas on public.notificacoes;
create policy notificacoes_minhas on public.notificacoes
  for select to authenticated using (usuario_id = (select auth.uid()));

drop policy if exists notificacoes_dispensa on public.notificacoes;
create policy notificacoes_dispensa on public.notificacoes
  for delete to authenticated using (usuario_id = (select auth.uid()));

-- Sem policy de INSERT nem de UPDATE de propósito: ninguém fabrica aviso para
-- si nem reescreve o texto de um. Criar é dos gatilhos (SECURITY DEFINER);
-- marcar como lida é da função abaixo, que só mexe no carimbo.

create or replace function public.marcar_notificacoes_lidas(p_ids uuid[] default null)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare eu uuid := (select auth.uid()); n int;
begin
  if eu is null then return 0; end if;
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

-- Contador para o sininho, numa requisição só (mesmo padrão de minhas_nao_lidas).
create or replace view public.minhas_notificacoes_novas
with (security_invoker = on) as
select count(*)::int as total
  from public.notificacoes
 where usuario_id = (select auth.uid()) and lida_em is null;

grant select on public.minhas_notificacoes_novas to authenticated;

/**
 * Entrega para pessoas específicas (o push existente só sabia transmitir).
 * p_para: lista de destinatários; a edge function cruza com as inscrições.
 */
create or replace function public.push_notificar_usuarios(
  p_assunto text, p_titulo text, p_corpo text, p_url text, p_para uuid[], p_tag text default null
)
returns void
language plpgsql
security definer
set search_path = public, net, vault
as $$
declare v_key text;
begin
  if p_para is null or array_length(p_para, 1) is null then return; end if;
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'PUSH_ENVIO_KEY' limit 1;
  if v_key is null then return; end if;
  perform net.http_post(
    url := 'https://mdgttlgtrrmkmqttrxdq.supabase.co/functions/v1/enviar-push',
    headers := jsonb_build_object('Content-Type','application/json','x-ecosurf-key', v_key),
    body := jsonb_build_object('assunto',p_assunto,'titulo',p_titulo,'corpo',p_corpo,'url',p_url,
                               'tag',p_tag,'paraUserIds',to_jsonb(p_para)),
    timeout_milliseconds := 5000
  );
exception when others then
  -- Avisar nunca pode derrubar o que gerou o aviso.
  null;
end;
$$;

revoke execute on function public.push_notificar_usuarios(text,text,text,text,uuid[],text)
  from public, anon, authenticated;

/**
 * Registra o aviso e, se for a hora, toca o celular.
 *
 * Agrupa pelo `chave` e só dispara push quando faz mais de 2 minutos desde o
 * último do mesmo assunto — uma conversa animada não vira metralhadora.
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
  if p_usuario is null or p_usuario = coalesce(p_ator, '00000000-0000-0000-0000-000000000000'::uuid) then
    return;
  end if;

  select avisada_em into v_antes
    from notificacoes
   where usuario_id = p_usuario and chave = p_chave and lida_em is null
   limit 1;
  if v_antes is not null and v_antes > now() - interval '2 minutes' then
    v_avisar := false;
  end if;

  insert into notificacoes (usuario_id, tipo, titulo, corpo, url, ator_id, chave, avisada_em)
  values (p_usuario, p_tipo, p_titulo, p_corpo, p_url, p_ator, p_chave,
          case when v_avisar then now() else v_antes end)
  on conflict (usuario_id, chave) where lida_em is null
  do update set titulo = excluded.titulo,
                corpo = excluded.corpo,
                url = excluded.url,
                ator_id = excluded.ator_id,
                criada_em = now(),
                avisada_em = excluded.avisada_em;

  if v_avisar then
    perform push_notificar_usuarios(p_assunto_push, p_titulo, p_corpo, p_url, array[p_usuario], p_chave);
  end if;
exception when others then
  null;
end;
$$;

revoke execute on function public.notificar(uuid,text,text,text,text,uuid,text,text)
  from public, anon, authenticated;

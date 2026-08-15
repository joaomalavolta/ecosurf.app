-- 0050 — Bloquear e denunciar: a saída para quem recebe o que não pediu
--
-- A caixa de entrada é aberta a qualquer pessoa da rede. Sem isto, quem
-- recebe algo indesejado só tem "ignorar" — e agora ainda toca o celular.

/* ── 1. Bloqueio ────────────────────────────────────────────────────── */

create table if not exists public.bloqueios (
  bloqueador_id uuid not null references auth.users(id) on delete cascade,
  bloqueado_id uuid not null references auth.users(id) on delete cascade,
  criado_em timestamptz not null default now(),
  primary key (bloqueador_id, bloqueado_id),
  constraint bloqueio_nao_reflexivo check (bloqueador_id <> bloqueado_id)
);

create index if not exists idx_bloqueios_bloqueado on public.bloqueios (bloqueado_id);

alter table public.bloqueios enable row level security;

-- Cada um vê, cria e desfaz APENAS os próprios bloqueios.
--
-- Ninguém consegue descobrir que foi bloqueado: não há policy que entregue
-- linhas onde você é o bloqueado. Bloqueio silencioso é o padrão certo —
-- avisar convida à retaliação.
drop policy if exists bloqueios_meus on public.bloqueios;
create policy bloqueios_meus on public.bloqueios
  for select to authenticated using (bloqueador_id = (select auth.uid()));

drop policy if exists bloqueios_criar on public.bloqueios;
create policy bloqueios_criar on public.bloqueios
  for insert to authenticated with check (bloqueador_id = (select auth.uid()));

drop policy if exists bloqueios_desfazer on public.bloqueios;
create policy bloqueios_desfazer on public.bloqueios
  for delete to authenticated using (bloqueador_id = (select auth.uid()));

/**
 * Existe bloqueio entre os dois, em qualquer direção?
 *
 * Sem EXECUTE para ninguém: só roda dentro de gatilho e de função
 * SECURITY DEFINER. Se fosse chamável, viraria sonda — daria para descobrir
 * quem te bloqueou, que é justamente o que o bloqueio silencioso evita.
 */
create or replace function public.ha_bloqueio(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from bloqueios
     where (bloqueador_id = p_a and bloqueado_id = p_b)
        or (bloqueador_id = p_b and bloqueado_id = p_a)
  )
$$;

revoke execute on function public.ha_bloqueio(uuid, uuid) from public, anon, authenticated;

/**
 * Barra a mensagem no gatilho, não na policy.
 *
 * Se a checagem virasse policy, `authenticated` precisaria de EXECUTE em
 * ha_bloqueio() — e aí qualquer um poderia sondar se foi bloqueado. Gatilho
 * dispara sem EXECUTE do usuário, então a barreira fica fechada dos dois lados.
 */
create or replace function public.bloqueio_barra_mensagem()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_outro uuid;
begin
  select p.usuario_id into v_outro
    from conversa_participantes p
   where p.conversa_id = new.conversa_id and p.usuario_id <> new.autor_id
   limit 1;

  if v_outro is not null and ha_bloqueio(new.autor_id, v_outro) then
    -- Mensagem neutra de propósito: não confirma quem bloqueou quem.
    raise exception 'Não foi possível enviar mensagem para esta pessoa.';
  end if;
  return new;
end;
$$;

revoke execute on function public.bloqueio_barra_mensagem() from public, anon, authenticated;

drop trigger if exists trg_bloqueio_barra_mensagem on public.mensagens;
create trigger trg_bloqueio_barra_mensagem
  before insert on public.mensagens
  for each row execute function public.bloqueio_barra_mensagem();

-- Abrir conversa com quem há bloqueio também não rola.
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

/* ── 2. Denúncia ────────────────────────────────────────────────────── */

-- Uma fila só de moderação: a tabela que já servia às fotos passa a receber
-- também denúncia de pessoa/conversa. Moderador olha num lugar, não em dois.
alter table public.denuncias alter column foto_id drop not null;

alter table public.denuncias add column if not exists tipo text not null default 'foto';
alter table public.denuncias add column if not exists alvo_id uuid references auth.users(id) on delete set null;
alter table public.denuncias add column if not exists conversa_id uuid references public.conversas(id) on delete set null;
alter table public.denuncias add column if not exists detalhe text;
alter table public.denuncias add column if not exists status text not null default 'aberta';
alter table public.denuncias add column if not exists resolvida_em timestamptz;
alter table public.denuncias add column if not exists resolvida_por uuid references auth.users(id) on delete set null;

alter table public.denuncias drop constraint if exists denuncia_tipo_coerente;
alter table public.denuncias add constraint denuncia_tipo_coerente check (
  (tipo = 'foto' and foto_id is not null) or
  (tipo = 'conversa' and alvo_id is not null)
);

alter table public.denuncias drop constraint if exists denuncia_status_valido;
alter table public.denuncias add constraint denuncia_status_valido
  check (status in ('aberta', 'resolvida', 'arquivada'));

create index if not exists idx_denuncias_status on public.denuncias (status, criada_em desc);

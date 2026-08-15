-- 0042 — Mensagens privadas entre usuários (conversas 1:1)
--
-- Modelo com tabela de participantes (em vez de remetente/destinatário fixos)
-- para não fechar a porta de conversas em grupo mais adiante.
--
-- Regra central: só quem participa lê ou escreve. Ninguém entra numa conversa
-- por conta própria — a criação passa por abrir_conversa(), que garante o par.

create table if not exists public.conversas (
  id uuid primary key default gen_random_uuid(),
  criada_em timestamptz not null default now(),
  ultima_em timestamptz not null default now()
);

create table if not exists public.conversa_participantes (
  conversa_id uuid not null references public.conversas(id) on delete cascade,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  lida_em timestamptz,
  primary key (conversa_id, usuario_id)
);

create table if not exists public.mensagens (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references public.conversas(id) on delete cascade,
  autor_id uuid not null references auth.users(id) on delete cascade,
  corpo text not null check (length(btrim(corpo)) between 1 and 4000),
  criada_em timestamptz not null default now()
);

create index if not exists idx_mensagens_conversa on public.mensagens (conversa_id, criada_em);
create index if not exists idx_participantes_usuario on public.conversa_participantes (usuario_id);
create index if not exists fk_mensagens_autor on public.mensagens (autor_id);

-- SECURITY DEFINER: consultar conversa_participantes dentro de uma policy da
-- própria tabela recursaria na RLS (mesmo padrão usado em comunidades).
create or replace function public.eh_participante(p_conversa uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from conversa_participantes p
    where p.conversa_id = p_conversa and p.usuario_id = (select auth.uid())
  )
$$;

alter table public.conversas enable row level security;
alter table public.conversa_participantes enable row level security;
alter table public.mensagens enable row level security;

drop policy if exists conversas_participante_le on public.conversas;
create policy conversas_participante_le on public.conversas
  for select to authenticated using (public.eh_participante(id));

drop policy if exists participantes_le on public.conversa_participantes;
create policy participantes_le on public.conversa_participantes
  for select to authenticated using (public.eh_participante(conversa_id));

-- Cada um marca a própria leitura; ninguém mexe no 'lida_em' alheio.
drop policy if exists participantes_marca_leitura on public.conversa_participantes;
create policy participantes_marca_leitura on public.conversa_participantes
  for update to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));

drop policy if exists mensagens_le on public.mensagens;
create policy mensagens_le on public.mensagens
  for select to authenticated using (public.eh_participante(conversa_id));

drop policy if exists mensagens_envia on public.mensagens;
create policy mensagens_envia on public.mensagens
  for insert to authenticated
  with check (autor_id = (select auth.uid()) and public.eh_participante(conversa_id));

-- Apagar só a própria mensagem.
drop policy if exists mensagens_apaga_propria on public.mensagens;
create policy mensagens_apaga_propria on public.mensagens
  for delete to authenticated using (autor_id = (select auth.uid()));

-- Caixa de entrada ordena por atividade: o gatilho mantém ultima_em em dia.
create or replace function public.mensagem_toca_conversa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update conversas set ultima_em = new.criada_em where id = new.conversa_id;
  return new;
end;
$$;

drop trigger if exists trg_mensagem_toca_conversa on public.mensagens;
create trigger trg_mensagem_toca_conversa
  after insert on public.mensagens
  for each row execute function public.mensagem_toca_conversa();

-- Freio simples contra enxurrada (loop de cliente ou spam manual).
create or replace function public.mensagem_limite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recentes int;
begin
  select count(*) into recentes from mensagens
   where autor_id = new.autor_id and criada_em > now() - interval '1 minute';
  if recentes >= 30 then
    raise exception 'Muitas mensagens em pouco tempo. Espere um instante.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_mensagem_limite on public.mensagens;
create trigger trg_mensagem_limite
  before insert on public.mensagens
  for each row execute function public.mensagem_limite();

/**
 * Abre (ou recupera) a conversa 1:1 com outra pessoa.
 *
 * É o único caminho para criar conversa: assim o par fica garantido e
 * ninguém se enfia numa conversa alheia inserindo uma linha de participante.
 */
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

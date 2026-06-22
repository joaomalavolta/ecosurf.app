-- ════════════════════════════════════════════════════════════════════════
-- Painel Administrativo: papéis, soft-delete, auditoria e RLS de gestão.
-- Acesso a dados administrativos é bloqueado no BANCO (não só no front).
-- ════════════════════════════════════════════════════════════════════════

-- 1) Papéis (role): user / analyst / moderator / admin / super_admin
alter table perfis drop constraint if exists perfis_papel_check;
update perfis set papel = 'user' where papel = 'membro';
update perfis set papel = 'moderator' where papel = 'moderador';
alter table perfis alter column papel set default 'user';
alter table perfis add constraint perfis_papel_check
  check (papel in ('user', 'analyst', 'moderator', 'admin', 'super_admin'));

-- 2) Soft-delete + status de moderação nas fotos
alter table fotos add column if not exists status text not null default 'aprovada'
  check (status in ('pendente', 'aprovada', 'rejeitada', 'ocultada', 'removida'));
alter table fotos add column if not exists deleted_at timestamptz;
alter table fotos add column if not exists deleted_by uuid references perfis(id) on delete set null;
alter table fotos add column if not exists delete_reason text;

-- feed público: só fotos aprovadas, não removidas/ocultas
create or replace view fotos_publicas with (security_invoker = true) as
  select f.id, f.pico_id, f.capturada_em, f.storage_path, f.altura_mare_m,
         f.vento_tipo, f.observacao, f.procedencia,
         coalesce(p.nome, 'anônimo') as autor_nome
  from fotos f
  left join perfis p on p.id = f.autor_id
  where f.deleted_at is null
    and coalesce(f.status, 'aprovada') = 'aprovada'
    and not coalesce(f.oculta, false);
grant select on fotos_publicas to anon, authenticated;

-- 3) Trilha de auditoria
create table if not exists admin_logs (
  id             uuid primary key default gen_random_uuid(),
  admin_id       uuid references perfis(id) on delete set null,
  papel          text,
  acao           text not null,
  item_tipo      text,
  item_id        text,
  valor_anterior jsonb,
  valor_novo     jsonb,
  motivo         text,
  criado_em      timestamptz not null default now()
);
create index if not exists admin_logs_criado_idx on admin_logs (criado_em desc);
alter table admin_logs enable row level security;

-- 4) Políticas de gestão. (staff = moderator+; admin = admin/super_admin)
-- fotos: staff modera (status/oculta/soft-delete); admin pode apagar de vez
drop policy if exists fotos_moderacao on fotos;
create policy fotos_moderacao on fotos for update to authenticated
  using (exists (select 1 from perfis pp where pp.id = auth.uid() and pp.papel in ('moderator', 'admin', 'super_admin')))
  with check (exists (select 1 from perfis pp where pp.id = auth.uid() and pp.papel in ('moderator', 'admin', 'super_admin')));
create policy fotos_admin_delete on fotos for delete to authenticated
  using (exists (select 1 from perfis pp where pp.id = auth.uid() and pp.papel in ('admin', 'super_admin')));

-- ameaças: staff atualiza (status/gravidade); admin apaga
create policy ameacas_staff_update on ameacas for update to authenticated
  using (exists (select 1 from perfis pp where pp.id = auth.uid() and pp.papel in ('moderator', 'admin', 'super_admin')))
  with check (exists (select 1 from perfis pp where pp.id = auth.uid() and pp.papel in ('moderator', 'admin', 'super_admin')));
create policy ameacas_admin_delete on ameacas for delete to authenticated
  using (exists (select 1 from perfis pp where pp.id = auth.uid() and pp.papel in ('admin', 'super_admin')));

-- picos: admin enxerga todos (inclusive abafado) e edita
create policy picos_admin_select on picos for select to authenticated
  using (exists (select 1 from perfis pp where pp.id = auth.uid() and pp.papel in ('admin', 'super_admin')));
create policy picos_admin_write on picos for all to authenticated
  using (exists (select 1 from perfis pp where pp.id = auth.uid() and pp.papel in ('admin', 'super_admin')))
  with check (exists (select 1 from perfis pp where pp.id = auth.uid() and pp.papel in ('admin', 'super_admin')));

-- perfis: admin altera papel/validação de outros
create policy perfis_admin_update on perfis for update to authenticated
  using (exists (select 1 from perfis pp where pp.id = auth.uid() and pp.papel in ('admin', 'super_admin')))
  with check (exists (select 1 from perfis pp where pp.id = auth.uid() and pp.papel in ('admin', 'super_admin')));

-- denúncias: staff lê
drop policy if exists denuncias_leitura_mod on denuncias;
create policy denuncias_leitura_mod on denuncias for select to authenticated
  using (exists (select 1 from perfis pp where pp.id = auth.uid() and pp.papel in ('moderator', 'admin', 'super_admin')));

-- logs: staff registra; admin lê
create policy admin_logs_insert on admin_logs for insert to authenticated
  with check (admin_id = auth.uid() and exists (select 1 from perfis pp where pp.id = auth.uid() and pp.papel in ('moderator', 'admin', 'super_admin')));
create policy admin_logs_select on admin_logs for select to authenticated
  using (exists (select 1 from perfis pp where pp.id = auth.uid() and pp.papel in ('admin', 'super_admin')));

-- storage: staff pode remover arquivo de foto
create policy "fotos delete staff" on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and exists (select 1 from perfis pp where pp.id = auth.uid() and pp.papel in ('moderator', 'admin', 'super_admin')));

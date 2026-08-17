-- 0065 — O painel para de somar maçã com laranja
--
-- `admin_indicadores()` contava `select count(*) from ameacas`. Desde a 0063
-- essa tabela guarda as duas famílias, então o card "Alertas" do painel
-- passaria a subir a cada tartaruga avistada — e a moderação leria o número
-- como problema ambiental a resolver.
--
-- `ameacas` continua sendo só o que é alerta; `positivos` é chave nova, então
-- um app que ainda não conhece a chave recebe `undefined` e o cliente já
-- resolve com `?? 0` (services/admin.ts). Não há versão do app que quebre.
--
-- O resto da função fica idêntico, inclusive a checagem de papel no topo:
-- este é um `create or replace` de uma função SECURITY DEFINER, e reescrever
-- o corpo sem a checagem abriria os indicadores para qualquer autenticado.

create or replace function public.admin_indicadores()
returns json
language plpgsql
security definer
set search_path to 'public'
as $$
declare r json;
begin
  if not exists (
    select 1 from perfis
     where id = auth.uid() and papel in ('admin','super_admin','moderator','analyst')
  ) then
    raise exception 'acesso negado';
  end if;

  select json_build_object(
    'usuarios',       (select count(*) from perfis),
    'picos',          (select count(*) from picos),
    'fotos',          (select count(*) from fotos where deleted_at is null),
    'fotosPendentes', (select count(*) from fotos where status = 'pendente'),
    'fotosRemovidas', (select count(*) from fotos where deleted_at is not null),
    'ameacas',        (select count(*) from ameacas where tipo_registro = 'alerta'),
    'positivos',      (select count(*) from ameacas where tipo_registro = 'positivo'),
    'mutiroes',       (select count(*) from mutiroes),
    'bloqueados',     (select count(*) from perfis where bloqueado_em is not null),
    'logs',           (select count(*) from admin_logs)
  ) into r;
  return r;
end;
$$;

revoke execute on function public.admin_indicadores() from anon, public;

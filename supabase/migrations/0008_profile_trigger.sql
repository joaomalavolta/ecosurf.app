-- Cria automaticamente uma linha em `perfis` para todo novo usuário do Auth
-- (inclusive anônimo). Sem isto, fotos.autor_id (FK -> perfis) quebraria.
create or replace function public.handle_new_user()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  insert into public.perfis (id, telefone_validado)
  values (new.id, false)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

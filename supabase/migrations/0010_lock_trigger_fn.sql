-- handle_new_user() só deve rodar como trigger, nunca via /rest/v1/rpc.
-- Revoga EXECUTE para fechar a superfície (o trigger roda como dono da tabela).
revoke execute on function public.handle_new_user() from anon, authenticated, public;

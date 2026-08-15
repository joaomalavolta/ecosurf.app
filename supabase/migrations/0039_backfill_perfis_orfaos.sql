-- 0039 — Cria as linhas de `perfis` que faltavam
--
-- Três contas (criadas em jun/2026, antes do gatilho on_auth_user_created)
-- não tinham linha em `perfis`. O efeito era pior do que um erro: salvar
-- nome ou foto fazia UPDATE em 0 linhas — o PostgREST não reclama, então o
-- app dizia "salvo com sucesso" e nada era gravado.
--
-- Aqui criamos as faltantes com o mesmo padrão do gatilho. O app também
-- passou a usar upsert (ver definirNome/salvarPerfil), então o caso se
-- resolve sozinho se voltar a acontecer.
--
-- Idempotente: rodar de novo não insere nada.

insert into public.perfis (id, telefone_validado)
select u.id, false
from auth.users u
left join public.perfis p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

-- 0044 — Fecha porta que não precisa estar aberta (mensagens)
--
-- Toda função em `public` vira endpoint /rest/v1/rpc/… automaticamente. As
-- funções de gatilho não têm por que ser chamáveis de fora, `abrir_conversa`
-- não serve para quem não está logado (ela mesma recusa) e `eh_participante`
-- só existe para as policies.
--
-- Duas armadilhas descobertas ao aplicar, ambas verificadas antes:
--
--   • revogar de `anon`/`authenticated` não muda nada: o EXECUTE vem de
--     PUBLIC. Tem que revogar de PUBLIC e reconceder a quem precisa.
--   • gatilho continua disparando sem EXECUTE — o privilégio é conferido na
--     criação do trigger, não a cada linha.

revoke execute on function public.mensagem_toca_conversa() from public, anon, authenticated;
revoke execute on function public.mensagem_limite() from public, anon, authenticated;

revoke execute on function public.abrir_conversa(uuid) from public, anon;
grant execute on function public.abrir_conversa(uuid) to authenticated;

-- As policies chamam esta função como o usuário que consulta: `authenticated`
-- precisa manter o EXECUTE, senão a leitura das conversas quebra.
revoke execute on function public.eh_participante(uuid) from public, anon;
grant execute on function public.eh_participante(uuid) to authenticated;

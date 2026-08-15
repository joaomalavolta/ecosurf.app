-- 0049 — Fecha as RPCs dos gatilhos da central (mesma faxina da 0044)
--
-- Função de gatilho não tem por que virar endpoint /rest/v1/rpc/. E de novo:
-- revogar de anon/authenticated não basta, o EXECUTE vem de PUBLIC.
--
-- Verificado depois de aplicar: os quatro gatilhos continuam disparando —
-- o privilégio é conferido na criação do trigger, não a cada linha.
revoke execute on function public.notif_nova_mensagem() from public, anon, authenticated;
revoke execute on function public.notif_membro_comunidade() from public, anon, authenticated;
revoke execute on function public.notif_alerta_comunidade() from public, anon, authenticated;
revoke execute on function public.notif_mutirao_comunidade() from public, anon, authenticated;

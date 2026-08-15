# Edge Function: enviar-push

Envia Web Push (VAPID) para os inscritos, respeitando opt-out por assunto.
Chamada apenas por triggers do banco (via `pg_net`), autenticada por `x-ecosurf-key`.

## Assuntos
`alertas` · `mutiroes` · `picos` · `mensagens` · `comunidades`

Cada um pode ser recusado à parte pelo usuário, e o filtro é aplicado **aqui**
(servidor), não no cliente.

## Entrega dirigida (`paraUserIds`)
Sem esse campo, a função transmite: varre todas as inscrições e filtra. Com ele
(lista de até 500 uuids), busca só as inscrições dessas pessoas — é o que
mensagem privada exige, já que avisar uma pessoa não pode custar uma varredura
da base inteira.

Quem usa: `push_notificar_usuarios()` no banco, chamada por `notificar()`.

## Secrets necessários (Supabase → Edge Functions → Secrets)
- `VAPID_PRIVATE_KEY` — par da pública `BMfCQug...` (a mesma de `src/lib/push.ts`)
- `PUSH_ENVIO_KEY` — segredo compartilhado com o trigger `push_notificar`

## ⚠️ Regra de ouro
A `VAPID_PUBLICA` neste arquivo, a de `src/lib/push.ts` e o secret
`VAPID_PRIVATE_KEY` são UM ÚNICO par de chaves. Se divergirem, o serviço de
push rejeita com **403** e `enviadas` fica 0. Nunca regenere só um lado.

## Retorno
`{ enviadas, puladas, removidas, errosOutros }` — `errosOutros` lista falhas
não-fatais (fora 404/410) para diagnóstico; não deixe voltar a ser silencioso.

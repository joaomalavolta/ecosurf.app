# Migrations — ordem real de aplicação

A numeração tem duas duplicatas históricas. **Não renomear**: os nomes já
estão registrados no histórico do banco (`supabase_migrations.schema_migrations`)
e renomear quebraria a correspondência.

Ordem cronológica real (difere da alfabética nos pontos marcados):

| # | Arquivo | Observação |
|---|---------|-----------|
| … | 0001–0016 | ordem normal |
| 17a | `0017_mutiroes.sql` | ⚠️ aplicada ANTES de 0017_admin |
| 17b | `0017_admin.sql` | renomeia papéis para inglês (moderator/admin/super_admin) |
| 18–19 | `0018…`, `0019…` | ordem normal |
| 20–22 | `0020…`, `0021…`, `0022_ameacas_author_rls.sql`, `0022_ameacas_publicas_author_geom.sql` | ⚠️ aplicadas manualmente pelo SQL Editor — não constam no histórico. Continham `CREATE POLICY IF NOT EXISTS` (sintaxe inválida); as policies foram reaplicadas corretamente pela 0023. |
| 23 | `0023_transparencia_e_seguranca.sql` | transparência total + correções de segurança |
| 24 | `0024_advisors_seguranca.sql` | correções dos Security Advisors |
| 44 | `0044_mensagens_fecha_rpc_desnecessaria.sql` | ⚠️ **um arquivo, três registros no banco** — ver abaixo |

A partir da 0023, todas as migrations são aplicadas via MCP/CLI e ficam
registradas no histórico. Novas migrations: seguir numeração sequencial
única a partir de 0025.

## 0044 — um arquivo para três registros

O banco tem três entradas (`mensagens_fecha_rpc_desnecessaria`,
`…_public` e `mensagens_eh_participante_so_autenticado`) para o que o
repositório guarda num arquivo só. Foi assim porque a primeira tentativa **não
fez nada**: revogar `EXECUTE` de `anon`/`authenticated` não muda nada quando o
privilégio vem de `PUBLIC` — só se descobre conferindo o resultado depois, já
que o comando é aceito sem erro.

O arquivo `0044` guarda o estado final (revoga de `PUBLIC` e reconcede a quem
precisa), então replicar num banco novo dá o mesmo resultado. O que se perde é
só a correspondência 1-para-1 entre arquivo e registro nesse ponto.

Duas coisas verificadas ali que vale não redescobrir:

- **gatilho continua disparando sem `EXECUTE`** — o privilégio é conferido na
  criação do trigger, não a cada linha;
- **função usada em policy precisa de `EXECUTE` para `authenticated`** — a
  policy é avaliada como o usuário que consulta, então revogar quebra a leitura
  (foi o caso de `eh_participante`).

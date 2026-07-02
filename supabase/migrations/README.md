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

A partir da 0023, todas as migrations são aplicadas via MCP/CLI e ficam
registradas no histórico. Novas migrations: seguir numeração sequencial
única a partir de 0025.

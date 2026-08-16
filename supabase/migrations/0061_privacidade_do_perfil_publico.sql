-- 0061 — Escolher o que aparece no seu perfil público
--
-- "Botão esconder minhas publicações — fotos no perfil, por exemplo."
--
-- A primeira ideia era guardar isso em `user_preferences`, junto das outras
-- escolhas do app. Não funciona: a RLS de lá entrega a linha SÓ para o dono
-- (`auth.uid() = user_id`). Quem visita o perfil não conseguiria ler a
-- preferência, e o "esconder" esconderia apenas de quem já sabe.
--
-- Quem precisa enxergar a regra é o visitante. Então ela mora em `perfis`,
-- que é de leitura pública, e sai pela view `perfis_publicos`.
--
-- Três chaves em vez de uma: as fotos são imagens de gente e de lugar, o mapa
-- mostra por onde a pessoa anda, e alertas e mutirões são registro cívico —
-- alguém pode querer esconder o rosto e manter a denúncia de pé.
--
-- ⚠️ Isto é sobre a VITRINE, não sobre apagar. A foto continua no feed do
-- pico, o alerta continua no mapa público e o mutirão continua aceitando
-- inscrição. O que muda é o perfil deixar de reunir tudo num lugar só — que é
-- justamente o que incomoda quem não quer ser fácil de seguir.
--
-- Padrão `true`: ninguém acorda com o perfil esvaziado por causa desta
-- migration. Esconder é uma escolha ativa.

alter table public.perfis
  add column if not exists mostrar_fotos  boolean not null default true,
  add column if not exists mostrar_mapa   boolean not null default true,
  add column if not exists mostrar_acoes  boolean not null default true;

-- ⚠️ ARMADILHA DESTA TABELA: o SELECT de `perfis` não é da tabela, é COLUNA A
-- COLUNA. Cada uma tem `grant select (col) to anon, authenticated` explícito —
-- e é assim de propósito, porque `telefone_validado` é liberada só para
-- authenticated. Coluna nova nasce SEM grant nenhum.
--
-- Sem as linhas abaixo, `perfis_publicos` (que é security_invoker desde a
-- 0059, ou seja, roda com as permissões de quem consulta) passaria a
-- selecionar colunas que o visitante não pode ler — e a view INTEIRA falharia.
-- Não seria o botão de privacidade que quebraria: seria o diretório de
-- surfistas, as páginas de perfil e tudo o mais que lê essa view.
grant select (mostrar_fotos, mostrar_mapa, mostrar_acoes)
  on public.perfis to anon, authenticated;

comment on column public.perfis.mostrar_fotos is
  'Perfil público exibe a grade de fotos. Não afeta o feed dos picos.';
comment on column public.perfis.mostrar_mapa is
  'Perfil público exibe o mapa de contribuições. Não afeta o mapa público.';
comment on column public.perfis.mostrar_acoes is
  'Perfil público lista alertas e mutirões. Não afeta o mapa nem as inscrições.';

-- A view precisa devolver as três, senão o visitante não tem como respeitá-las.
-- `create or replace` exige as colunas antigas na mesma ordem — as novas entram
-- no fim.
create or replace view public.perfis_publicos as
  select id, nome, foto_url, nivel, cidade, criado_em,
         mostrar_fotos, mostrar_mapa, mostrar_acoes
    from public.perfis
   where nome is not null and btrim(nome) <> '';

-- A 0059 tornou esta view security_invoker; `create or replace` preserva as
-- opções, mas reafirmar aqui evita que a próxima edição desfaça sem querer.
alter view public.perfis_publicos set (security_invoker = true);

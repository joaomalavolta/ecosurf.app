-- 0070 — Quantos metros quadrados de vegetação
--
-- "Vegetação preservada ou em recuperação" era a única categoria em que o
-- TAMANHO é parte do fato. Um canteiro de restinga replantado num quintal e
-- um hectare de mata ciliar em recuperação entravam no mapa como o mesmo
-- ponto, e quem lê não tinha como saber a diferença.
--
-- ── Coluna genérica, campo específico ─────────────────────────────────────
--
-- `area_m2` não é `area_da_vegetacao`: uma área faz sentido para outras
-- categorias que ainda podem aparecer (um trecho de praia interditado, uma
-- mancha de óleo). O formulário mostra o campo só na vegetação — mesma
-- divisão de `gravidade`, que existe na tabela para todos e só é perguntada
-- nos alertas.
--
-- ── Nulo é resposta ───────────────────────────────────────────────────────
--
-- Sem NOT NULL e sem default: quem não sabe a área não deve ser obrigado a
-- inventar um número. Nulo significa "não informado", e é diferente de zero.
--
-- O CHECK é de sanidade, não de regra de negócio: positivo, e no máximo
-- 10 km² (10.000.000 m²). Acima disso é dedo escorregando no teclado — a
-- maior unidade de conservação do litoral brasileiro tem outra ordem de
-- grandeza, e quem precisar mapear isso não vai fazê-lo com um ponto só.
--
-- Conferido em teste com rollback: grava e lê pela view; nulo continua
-- aceito; zero e negativo são recusados; o teto barra o absurdo; e os 11
-- registros existentes seguem sem área, que é o que eles são.

alter table public.ameacas
  add column if not exists area_m2 numeric;

alter table public.ameacas drop constraint if exists ameacas_area_m2_check;
alter table public.ameacas add constraint ameacas_area_m2_check
  check (area_m2 is null or (area_m2 > 0 and area_m2 <= 10000000));

comment on column public.ameacas.area_m2 is
  'Area em metros quadrados. Hoje so a vegetacao pergunta, mas a coluna e '
  'generica. NULL = nao informado, que e diferente de zero — ver migration 0070.';

create or replace view public.ameacas_publicas as
  select a.id, a.titulo, a.categoria, a.status, a.gravidade, a.pico_id,
         a.municipio, a.uf, a.precisao, a.descricao, a.criada_em, a.local_nome,
         a.recorrente, a.images,
         extensions.st_y(coalesce(a.geom_aprox, a.geom)) as lat,
         extensions.st_x(coalesce(a.geom_aprox, a.geom)) as lng,
         a.denunciante_id as autor_id,
         p.nome as autor_nome,
         p.foto_url as autor_foto,
         a.comunidade_id,
         c.nome as comunidade_nome,
         c.avatar_url as comunidade_avatar,
         a.ocorrido_em,
         a.tipo_registro,
         a.moderacao,
         a.area_m2
    from public.ameacas a
    left join public.perfis p on p.id = a.denunciante_id
    left join public.comunidades c on c.id = a.comunidade_id and c.deleted_at is null;

alter view public.ameacas_publicas set (security_invoker = true);

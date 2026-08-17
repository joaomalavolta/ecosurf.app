-- 0068 — Conserta os títulos que ficaram com o id da categoria
--
-- Quatro registros mostram no mapa, no feed e no compartilhamento coisas como
--
--   "oleo — Rio do Poço"
--   "lixo-rio — Rio Itanhaém, Baixio"
--   "erosao — Boca da Barra "
--
-- em vez de "Óleo ou substância — Rio do Poço". É resíduo do `salvarEdicao`
-- da tela de detalhe, que montava o título com `${editCategoria}` — o ID —
-- em vez do rótulo. O código foi corrigido junto dos Registros Positivos, mas
-- o que já estava gravado continuou gravado: editar um registro renomeava-o
-- para o id, e a partir daí era esse o nome dele.
--
-- ── Por que os rótulos estão escritos aqui ────────────────────────────────
--
-- A fonte de verdade dos rótulos é `src/components/SeletorCategoria.tsx`, e
-- duplicá-la em SQL é justamente o que este projeto evita. A exceção se
-- justifica porque isto é um CONSERTO PONTUAL, não uma regra: a migration é
-- um retrato de um instante, roda uma vez e não volta a ser consultada. Se
-- amanhã "Óleo ou substância" mudar de nome, este arquivo continua descrevendo
-- corretamente o que foi feito hoje.
--
-- Só as categorias que de fato aparecem nos títulos ruins entram na lista.
--
-- ── O recorte é preciso ───────────────────────────────────────────────────
--
-- `titulo like categoria || ' —%'` casa exatamente com o formato que o bug
-- produzia. Nenhum título correto começa com o próprio id — "Lixo na praia"
-- não é "lixo-praia" — então não há como pegar linha sadia por engano.
--
-- O `btrim` no fim resolve de passagem os espaços sobrando ("Boca da Barra "),
-- que vinham do campo digitado e apareciam no meio das frases compartilhadas.

update public.ameacas a
   set titulo = r.rotulo || ' — ' ||
                coalesce(nullif(btrim(a.local_nome), ''), nullif(btrim(a.municipio), ''), 'local registrado')
  from (values
    ('lixo-praia',            'Lixo na praia'),
    ('lixo-rio',              'Lixo no rio'),
    ('esgoto',                'Esgoto aparente'),
    ('erosao',                'Erosão costeira'),
    ('oleo',                  'Óleo ou substância'),
    ('animal',                'Animal morto/encalhado'),
    ('entulho',               'Entulho'),
    ('microplasticos',        'Microplásticos'),
    ('espuma',                'Espuma / mau cheiro'),
    ('queimada',              'Queimada'),
    ('ocupacao',              'Ocupação irregular'),
    ('outro',                 'Outro impacto'),
    ('fauna-avistada',        'Fauna avistada'),
    ('area-desova',           'Área de desova'),
    ('filhotes',              'Filhotes avistados'),
    ('vegetacao-recuperacao', 'Vegetação preservada ou em recuperação'),
    ('coleta-seletiva',       'Ponto de coleta seletiva')
  ) as r(categoria, rotulo)
 where a.categoria = r.categoria
   and a.titulo like a.categoria || ' —%';

-- Espaço sobrando no fim do título atinge também linhas que não passaram pelo
-- bug ("Entulho — Rio do Poço "): sai junto, porque é o mesmo defeito visível.
update public.ameacas
   set titulo = btrim(titulo)
 where titulo <> btrim(titulo);

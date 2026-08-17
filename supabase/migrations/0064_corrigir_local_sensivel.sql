-- 0064 — Duas correções na proteção de local sensível da 0063
--
-- As duas apareceram no mesmo teste, e uma escondia a outra.
--
-- ═════════ 1. O arredondamento andava para o norte ═══════════════════════
--
-- `ponto_aproximado` fazia `round(x, 2) + 0.005`. `round` já devolve o centro
-- da célula; somar meia célula joga o ponto para a BORDA dela. Aplicar a
-- função de novo sobre o próprio resultado cai num empate de arredondamento —
-- e `round` numérico no Postgres desempata para longe do zero. Ou seja: o
-- resultado depende do SINAL.
--
--   latitude −29,9876543  →  −29,985  →  −29,985  (estável, litoral sul)
--   latitude   2,0234567  →    2,025  →    2,035  (anda 1,1 km, Amapá)
--
-- Todo o litoral do Sudeste ao Sul é negativo, então isto nunca apareceria
-- em teste feito com dado de Santos ou de Tramandaí. Do Amapá até parte do
-- Pará a latitude é positiva, e ali cada edição do registro empurraria o
-- pino 1,1 km para o norte, para sempre.
--
-- A correção é usar `floor` e somar meia célula: aí o ponto cai no centro
-- VERDADEIRO da célula, e o centro sempre pertence à própria célula — a
-- função vira idempotente nos dois hemisférios, que é a propriedade de que o
-- item 2 abaixo depende.
--
-- Nenhum registro sensível existe em produção ainda (conferido: 0 linhas em
-- `ameacas_local_exato`), então não há coordenada gravada para converter.
--
-- ═════════ 2. Um ninho no lugar errado não podia ser corrigido ═══════════
--
-- A 0063 reescrevia `geom` a partir do cofre a cada gravação. Isso resolve o
-- ponto "caminhar" a cada edição — e resolve demais: passava a IGNORAR
-- qualquer ponto novo. Quem marcou a área de desova 300 m para dentro do mar
-- não tinha mais conserto. Salvava, a tela dizia que salvou, o pino não saía
-- do lugar.
--
-- Como distinguir "não mexi" de "mexi": quem edita recebe da view o ponto
-- APROXIMADO e devolve esse mesmo valor quando não toca no mapa. Então
--
--   aproximar(o que chegou) == aproximar(o que está guardado)
--       → é o eco do que nós mesmos entregamos: mantém o exato do cofre
--   diferente
--       → a pessoa arrastou o pino: o ponto novo passa a ser o exato
--
-- O preço é conhecido e é o preço certo: mover o pino DENTRO da mesma célula
-- de ~1,1 km não tem efeito. Essa é exatamente a precisão que a proteção
-- existe para não revelar — se um arrasto de 200 m mudasse algo visível, o
-- arrasto viraria régua para descobrir o ponto verdadeiro.
--
-- Conferido em teste com rollback contra produção: aproximação idempotente
-- nos dois hemisférios; eco do aproximado não estraga o cofre; edição de
-- texto não move o ponto; arrastar 5 km corrige o registro; ajuste dentro da
-- mesma célula não vaza precisão; voltar para categoria comum volta a exata.

/**
 * Ponto aproximado: a célula de ~1,1 km em que o registro está, e nada mais.
 *
 * `floor(x / 0.01) * 0.01 + 0.005` = centro da célula. O centro pertence à
 * célula, então aproximar duas vezes dá o mesmo valor — em qualquer sinal.
 * É essa idempotência que permite ao gatilho reconhecer o aproximado que ele
 * mesmo entregou e não confundi-lo com um ponto novo.
 *
 * Determinístico de propósito: com ruído aleatório, cada leitura moveria o
 * ponto e o mapa ficaria inquieto — além de permitir triangular a posição
 * verdadeira tirando a média de várias leituras.
 *
 * O que o público vê não é "o ponto errado por 1 km": é o centro de uma
 * célula, sem informação sobre onde dentro dela o registro está.
 */
create or replace function public.ponto_aproximado(p_geom extensions.geometry)
returns extensions.geometry
language sql
immutable
as $$
  select extensions.st_setsrid(
    extensions.st_makepoint(
      floor(extensions.st_x(p_geom)::numeric / 0.01) * 0.01 + 0.005,
      floor(extensions.st_y(p_geom)::numeric / 0.01) * 0.01 + 0.005
    ), 4326)
$$;

create or replace function public.protege_local_sensivel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guardado extensions.geometry;
  v_exato    extensions.geometry;
begin
  if new.geom is null then return new; end if;

  if not categoria_sensivel(new.categoria) then
    -- Categoria comum: transparência total, como sempre foi.
    new.geom_aprox := coalesce(new.geom_aprox, new.geom);
    new.precisao := coalesce(nullif(new.precisao, 'aproximada'), 'exata');
    return new;
  end if;

  select geom into v_guardado from ameacas_local_exato where ameaca_id = new.id;

  if v_guardado is null then
    v_exato := new.geom;                 -- primeira vez: o que chegou é o exato
  elsif extensions.st_equals(ponto_aproximado(new.geom), ponto_aproximado(v_guardado)) then
    v_exato := v_guardado;               -- eco do aproximado: nada mudou
  else
    v_exato := new.geom;                 -- arrastou o pino de verdade
  end if;

  insert into ameacas_local_exato (ameaca_id, geom)
  values (new.id, v_exato)
  on conflict (ameaca_id) do update set geom = excluded.geom;

  new.geom := ponto_aproximado(v_exato);
  new.geom_aprox := new.geom;
  new.precisao := 'aproximada';
  return new;
end;
$$;

revoke execute on function public.protege_local_sensivel() from public, anon, authenticated;

-- 0063 — Registros Positivos: o mapa também mostra o que vai bem
--
-- Até aqui o app só sabia registrar problema. Agora a mesma tabela guarda os
-- dois lados: o que precisa de atenção e o que merece ser visto — fauna,
-- desova, filhotes, vegetação preservada, ponto de coleta.
--
-- MESMA TABELA, de propósito. Alerta e registro positivo têm exatamente os
-- mesmos campos (categoria, local, foto, autor, comunidade, data) e vivem no
-- mesmo mapa. Uma tabela paralela duplicaria as 10 policies, os 2 gatilhos de
-- notificação, a view pública e todo consumidor no app — para guardar o mesmo
-- formato. O que muda é uma coluna.
--
-- Nome em português como o resto do schema (`ameacas`, `mutiroes`, `picos`):
-- `tipo_registro` com 'alerta' e 'positivo'.
--
-- ⚠️ RETROCOMPATIBILIDADE: o default é 'alerta', então as 10 ocorrências que
-- já existem continuam sendo exatamente o que eram, sem UPDATE nenhum.
--
-- Conferido em teste com rollback contra os dados de produção, 16 asserções:
-- os 10 registros antigos não se moveram nem mudaram de tipo; `fauna-avistada`
-- fica com o ponto exato; `area-desova` vira aproximada (0,87 km de desvio) e
-- o exato vai para o cofre; editar de comum para sensível também protege;
-- duas edições seguidas não fazem o ponto caminhar; terceiro logado lê 0
-- linhas do cofre, anon é barrado no grant, autor e moderação leem; apagar a
-- ocorrência apaga o cofre; o CHECK recusa tipo_registro inventado.

alter table public.ameacas
  add column if not exists tipo_registro text not null default 'alerta';

alter table public.ameacas drop constraint if exists ameacas_tipo_registro_check;
alter table public.ameacas add constraint ameacas_tipo_registro_check
  check (tipo_registro in ('alerta', 'positivo'));

comment on column public.ameacas.tipo_registro is
  'alerta = problema ambiental; positivo = biodiversidade/conservação. As duas '
  'famílias dividem a tabela porque têm os mesmos campos — ver migration 0063.';

-- As cinco categorias novas entram no CHECK que já existia. As antigas ficam
-- todas: há registros gravados com cada uma delas.
alter table public.ameacas drop constraint if exists ameacas_categoria_check;
alter table public.ameacas add constraint ameacas_categoria_check
  check (categoria in (
    -- Alertas ambientais (como estavam)
    'lixo-praia', 'lixo-rio', 'esgoto', 'erosao', 'oleo', 'animal', 'entulho',
    'microplasticos', 'espuma', 'queimada', 'ocupacao', 'outro',
    'poluicao', 'agua', 'privatizacao', 'obra',
    -- Registros positivos
    'fauna-avistada', 'area-desova', 'filhotes', 'vegetacao-recuperacao', 'coleta-seletiva'
  ));

-- ─────────────────────────────────────────────────────────────────────────
-- Proteção da localização sensível
--
-- Publicar a coordenada exata de uma desova ou de um ninho com filhotes é
-- entregar o endereço para quem quiser perturbar. A regra: guardar o ponto
-- exato, mostrar um aproximado.
--
-- Só blindar a view NÃO resolveria: `ameacas` tem leitura pública (policy
-- `ameacas_leitura_publica USING (true)` e grant de SELECT para anon), então
-- qualquer pessoa com a chave pública leria `geom` direto da tabela-base. Por
-- isso o ponto exato SAI da tabela e vai para uma tabela própria, com RLS que
-- só entrega ao autor e à moderação.
--
-- A coordenada original não é apagada nem alterada — muda de lugar.
-- ─────────────────────────────────────────────────────────────────────────

-- Sem FOREIGN KEY de propósito, e isto custou uma tentativa: o gatilho que
-- guarda o ponto roda BEFORE INSERT — antes de a linha de `ameacas` existir —
-- e a FK recusava. Mover para AFTER não serve, porque aí `new.geom` já é o
-- aproximado e o exato teria se perdido no caminho.
--
-- A integridade fica no gatilho de exclusão logo abaixo, que apaga o cofre
-- junto com a ocorrência.
create table if not exists public.ameacas_local_exato (
  ameaca_id uuid primary key,
  geom extensions.geometry(Point, 4326) not null,
  criado_em timestamptz not null default now()
);

alter table public.ameacas_local_exato enable row level security;

-- A RESTRICTIVE de sempre (0053): tabela nova nasce coberta.
drop policy if exists sem_anonimo on public.ameacas_local_exato;
create policy sem_anonimo on public.ameacas_local_exato as restrictive to authenticated
  using (public.nao_anonimo()) with check (public.nao_anonimo());

drop policy if exists local_exato_autor_ou_staff on public.ameacas_local_exato;
create policy local_exato_autor_ou_staff on public.ameacas_local_exato
  for select to authenticated
  using (
    public.eh_staff()
    or exists (
      select 1 from public.ameacas a
       where a.id = ameaca_id and a.denunciante_id = (select auth.uid())
    )
  );

-- Ninguém escreve aqui pela API: quem grava é o gatilho, que é SECURITY
-- DEFINER. Sem policy de INSERT/UPDATE/DELETE, a RLS recusa todas.
revoke all on public.ameacas_local_exato from anon, authenticated;
grant select on public.ameacas_local_exato to authenticated;

/**
 * Categorias cujo ponto exato não vai para o mapa público.
 *
 * Função e não lista solta no gatilho: quando aparecer a próxima categoria
 * sensível (ninho de ave, espécie ameaçada), muda-se um lugar só.
 */
create or replace function public.categoria_sensivel(p_categoria text)
returns boolean
language sql
immutable
as $$
  select p_categoria in ('area-desova', 'filhotes')
$$;

/**
 * Ponto aproximado: célula de ~1,1 km, o ponto no centro dela.
 *
 * ⚠️ SUBSTITUÍDA PELA 0064. O `round(x,2) + 0.005` abaixo põe o ponto na
 * BORDA da célula, não no meio, e aplicar a função sobre o próprio resultado
 * cai num empate de arredondamento cujo desempate depende do sinal — em
 * latitude positiva (Amapá) o ponto andava 1,1 km ao norte a cada edição.
 * A 0064 troca por `floor`, que devolve o centro de verdade e é idempotente.
 *
 * Arredondar para 2 casas decimais dá uma célula de ~1,1 km na latitude do
 * litoral brasileiro. Somar meia célula tira o ponto do canto e põe no meio —
 * sem isso todos os registros aproximados cairiam sobre a mesma grade de
 * cruzamentos, o que anuncia "isto foi arredondado" com precisão maior do que
 * a que se quer esconder.
 *
 * Determinístico de propósito: com ruído aleatório, cada leitura moveria o
 * ponto e o mapa ficaria inquieto — além de permitir triangular a posição
 * verdadeira tirando a média de várias leituras.
 */
create or replace function public.ponto_aproximado(p_geom extensions.geometry)
returns extensions.geometry
language sql
immutable
as $$
  select extensions.st_setsrid(
    extensions.st_makepoint(
      round(extensions.st_x(p_geom)::numeric, 2) + 0.005,
      round(extensions.st_y(p_geom)::numeric, 2) + 0.005
    ), 4326)
$$;

/**
 * Antes de gravar: se a categoria é sensível, o exato vai para o cofre e o
 * que fica na linha é o aproximado.
 *
 * Roda em INSERT e UPDATE — inclusive quando alguém EDITA um registro comum
 * para uma categoria sensível, que é o caso fácil de esquecer.
 */
create or replace function public.protege_local_sensivel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_exato extensions.geometry;
begin
  if new.geom is null then return new; end if;

  if not categoria_sensivel(new.categoria) then
    -- Categoria comum: transparência total, como sempre foi.
    new.geom_aprox := coalesce(new.geom_aprox, new.geom);
    new.precisao := coalesce(nullif(new.precisao, 'aproximada'), 'exata');
    return new;
  end if;

  -- No UPDATE o `new.geom` já pode ser o aproximado de antes; o exato de
  -- verdade é o que está guardado. Sem isto, cada edição aproximaria o
  -- aproximado e o ponto sairia caminhando pelo mapa.
  select geom into v_exato from ameacas_local_exato where ameaca_id = new.id;
  v_exato := coalesce(v_exato, new.geom);

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

drop trigger if exists ameaca_protege_local on public.ameacas;
create trigger ameaca_protege_local
  before insert or update on public.ameacas
  for each row execute function public.protege_local_sensivel();

/** Apagou a ocorrência, apaga o ponto guardado — o que a FK faria. */
create or replace function public.limpa_local_exato()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from ameacas_local_exato where ameaca_id = old.id;
  return old;
end;
$$;

revoke execute on function public.limpa_local_exato() from public, anon, authenticated;

drop trigger if exists ameaca_limpa_local on public.ameacas;
create trigger ameaca_limpa_local
  after delete on public.ameacas
  for each row execute function public.limpa_local_exato();

-- ─────────────────────────────────────────────────────────────────────────
-- A view pública passa a servir o APROXIMADO
--
-- Para as 10 ocorrências que existem hoje, `geom_aprox` é igual a `geom` — o
-- app sempre gravou os dois com o mesmo valor ("transparência total", em
-- alertas.ts). Nada muda para elas. O coalesce cobre linha antiga sem aprox.
-- ─────────────────────────────────────────────────────────────────────────

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
         a.tipo_registro
    from public.ameacas a
    left join public.perfis p on p.id = a.denunciante_id
    left join public.comunidades c on c.id = a.comunidade_id and c.deleted_at is null;

alter view public.ameacas_publicas set (security_invoker = true);

-- Um registro positivo não tem gravidade: não é problema para escalonar.
create index if not exists ameacas_tipo_registro_idx on public.ameacas (tipo_registro);

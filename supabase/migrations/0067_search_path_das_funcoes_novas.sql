-- 0067 — `search_path` fixo nas funções que a 0062/0063 deixaram sem
--
-- O linter do Supabase apontou três: `categoria_sensivel` e
-- `ponto_aproximado` (0063) e `pico_id_imutavel` (0062).
--
-- Nenhuma delas é SECURITY DEFINER, então o risco aqui não é o clássico de
-- escalada de privilégio — é o de resolução: sem `search_path` fixo, a função
-- resolve nomes pelo caminho de quem CHAMA. Uma tabela ou operador plantado
-- num schema que venha antes muda o que a função faz sem que ela mude.
--
-- `search_path = ''` (vazio, e não 'public') porque nenhuma das três precisa
-- de schema nenhum: `pg_catalog` entra sempre, e tudo mais que elas usam já
-- está qualificado — `extensions.st_makepoint`, `extensions.st_x`. Se alguma
-- passar a precisar de algo em `public`, vai falhar alto na primeira chamada
-- em vez de resolver silenciosamente para a coisa errada.
--
-- ⚠️ `ponto_aproximado` é reescrita aqui com o corpo da 0064 (`floor`), não o
-- da 0063. Um `create or replace` traz o corpo inteiro junto — colar o corpo
-- antigo por distração desfaria a correção do hemisfério norte.

create or replace function public.categoria_sensivel(p_categoria text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_categoria in ('area-desova', 'filhotes')
$$;

create or replace function public.ponto_aproximado(p_geom extensions.geometry)
returns extensions.geometry
language sql
immutable
set search_path = ''
as $$
  select extensions.st_setsrid(
    extensions.st_makepoint(
      floor(extensions.st_x(p_geom)::numeric / 0.01) * 0.01 + 0.005,
      floor(extensions.st_y(p_geom)::numeric / 0.01) * 0.01 + 0.005
    ), 4326)
$$;

create or replace function public.pico_id_imutavel()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id then
    raise exception
      'O identificador do pico não pode mudar: ele está na URL e em 6 tabelas que apontam para ele. Para trocar o nome exibido, edite o campo nome.';
  end if;
  return new;
end;
$$;

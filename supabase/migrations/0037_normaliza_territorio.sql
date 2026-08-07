-- 0037 — Normaliza município/UF (tira espaços das pontas)
--
-- O formulário de alerta gravava `municipio` sem trim (os de pico e mutirão
-- já faziam). Resultado: "Itanhaém " (com espaço) virava uma cidade separada
-- de "Itanhaém" no Explorar, dividindo contadores e listas.
--
-- Aqui limpamos o que já está gravado e deixamos um gatilho para que nenhuma
-- outra via de escrita (app antigo em cache, painel, importação) recrie o
-- problema. Idempotente: rodar de novo não muda nada.

-- 1) Limpeza do que existe
update ameacas
   set municipio = btrim(municipio)
 where municipio is distinct from btrim(municipio);

update ameacas
   set local_nome = btrim(local_nome)
 where local_nome is distinct from btrim(local_nome);

update mutiroes
   set municipio = btrim(municipio)
 where municipio is distinct from btrim(municipio);

update picos
   set municipio = btrim(municipio)
 where municipio is distinct from btrim(municipio);

-- 2) Rede de segurança no banco: normaliza na escrita, venha de onde vier.
create or replace function public.normalizar_territorio()
returns trigger
language plpgsql
set search_path = 'public'
as $$
begin
  if new.municipio is not null then
    new.municipio := btrim(new.municipio);
  end if;
  if new.uf is not null then
    new.uf := upper(btrim(new.uf));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_ameacas_territorio on ameacas;
create trigger trg_ameacas_territorio
  before insert or update on ameacas
  for each row execute function public.normalizar_territorio();

drop trigger if exists trg_mutiroes_territorio on mutiroes;
create trigger trg_mutiroes_territorio
  before insert or update on mutiroes
  for each row execute function public.normalizar_territorio();

drop trigger if exists trg_picos_territorio on picos;
create trigger trg_picos_territorio
  before insert or update on picos
  for each row execute function public.normalizar_territorio();

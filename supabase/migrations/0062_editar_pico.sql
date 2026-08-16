-- 0062 — Quem criou o pico pode corrigi-lo
--
-- Staff já podia editar qualquer pico (policy da 0017). Faltava o autor: quem
-- cadastrou "Praia do Sonhoo" com dois "o", ou marcou o ponto 200 m para
-- dentro do mar, não tinha como consertar — só apagar e refazer, o que leva
-- junto as fotos e os alertas ligados ao pico.
--
-- ── O `id` é permanente, e isso não é detalhe ─────────────────────────────
--
-- O id do pico é o slug da URL (`/pico/praia-do-sonho`) e é apontado por SEIS
-- tabelas: ameacas, favoritos, feed_dia, fotos, mutiroes e perfis. Nenhuma FK
-- tem ON UPDATE CASCADE, então mudar o id ou explode numa violação de chave
-- estrangeira (pico com foto) ou passa em silêncio e quebra todo link já
-- compartilhado (pico sem foto).
--
-- Um gatilho fecha isso para TODO MUNDO, staff incluído. Não é desconfiança
-- do administrador: é que o estrago não depende de quem faz. Renomear o pico
-- muda o `nome`, que é o que aparece na tela; o id fica como está.
--
-- ⚠️ Não confundir: a policy nova NÃO deixa o autor mudar `criado_por` — o
-- `with check` exige que ele continue sendo o autor depois da edição. Sem
-- isso, daria para entregar o pico a outra pessoa (ou tomá-lo).
--
-- A caixa do Brasil da 0060 continua valendo em UPDATE, então editar também
-- não move um pico para fora do país.
--
-- Conferido em teste com rollback, com um autor COMUM (pegar um pico criado
-- pelo próprio super_admin provaria outra coisa — ele passa pela policy de
-- staff): autor edita o seu; não muda id, autoria nem sai do Brasil; terceiro
-- é barrado; staff edita qualquer um.

drop policy if exists picos_autor_update on public.picos;
create policy picos_autor_update on public.picos
  for update to authenticated
  using (criado_por = (select auth.uid()))
  with check (criado_por = (select auth.uid()));

create or replace function public.pico_id_imutavel()
returns trigger
language plpgsql
as $$
begin
  if new.id is distinct from old.id then
    raise exception
      'O identificador do pico não pode mudar: ele está na URL e em 6 tabelas que apontam para ele. Para trocar o nome exibido, edite o campo nome.';
  end if;
  return new;
end;
$$;

drop trigger if exists pico_id_travado on public.picos;
create trigger pico_id_travado
  before update on public.picos
  for each row execute function public.pico_id_imutavel();

-- ════════════════════════════════════════════════════════════════════════
-- 0023 — Transparência total + correções de segurança
--
-- Decisão de produto: SEM picos secretos e SEM anonimato de denunciante.
-- Credibilidade vem de gente identificada. Todo pico é público; todo alerta
-- mostra autor e localização exata.
--
-- Também corrige: (1) policies 0020/0021 que usavam CREATE POLICY IF NOT
-- EXISTS (sintaxe inválida — podem nunca ter sido aplicadas); (2) bucket
-- avatars sem checagem de dono; (3) status de moderação decidido pelo
-- cliente.
-- ════════════════════════════════════════════════════════════════════════

BEGIN;

-- ═══ 1. PICOS: todos públicos, sempre ═══

UPDATE picos SET visibilidade = 'publico' WHERE visibilidade <> 'publico';
ALTER TABLE picos ALTER COLUMN visibilidade SET DEFAULT 'publico';

-- Trava no banco: mesmo que algum código antigo tente, só existe 'publico'.
ALTER TABLE picos DROP CONSTRAINT IF EXISTS picos_visibilidade_check;
ALTER TABLE picos ADD CONSTRAINT picos_visibilidade_check
  CHECK (visibilidade = 'publico');

DROP POLICY IF EXISTS picos_leitura_publica ON picos;
CREATE POLICY picos_leitura_publica ON picos
  FOR SELECT USING (true);

-- Views/policies que filtravam por visibilidade continuam corretas
-- (a condição agora é sempre verdadeira), mas simplificamos as principais:
DROP POLICY IF EXISTS feed_leitura ON feed_dia;
CREATE POLICY feed_leitura ON feed_dia FOR SELECT USING (true);

DROP POLICY IF EXISTS fotos_leitura ON fotos;
CREATE POLICY fotos_leitura ON fotos FOR SELECT USING (true);

-- ═══ 2. ALERTAS: autor e local exato, sempre visíveis ═══

-- Alinha dados históricos: local aproximado passa a ser o exato.
UPDATE ameacas SET geom_aprox = geom WHERE geom IS NOT NULL;
UPDATE ameacas SET precisao = 'exata';
ALTER TABLE ameacas ALTER COLUMN precisao SET DEFAULT 'exata';
ALTER TABLE ameacas ALTER COLUMN anonima SET DEFAULT false;

-- Sem autor não há alerta (linhas órfãs antigas, se existirem, são de teste).
DELETE FROM ameacas WHERE denunciante_id IS NULL;
ALTER TABLE ameacas ALTER COLUMN denunciante_id SET NOT NULL;

-- View pública: coordenada exata + autor para todo mundo (sem CASE).
-- Mantém a mesma lista/ordem de colunas da view anterior (o Postgres não
-- permite remover colunas com CREATE OR REPLACE). `precisao` fica na view
-- por compatibilidade — agora é sempre 'exata'.
CREATE OR REPLACE VIEW ameacas_publicas AS
  SELECT a.id, a.titulo, a.categoria, a.status, a.gravidade, a.pico_id,
         a.municipio, a.uf, a.precisao, a.descricao, a.criada_em, a.local_nome,
         a.recorrente, a.images,
         extensions.st_y(a.geom) AS lat,
         extensions.st_x(a.geom) AS lng,
         a.denunciante_id AS autor_id,
         p.nome AS autor_nome,
         p.foto_url AS autor_foto
    FROM ameacas a
    LEFT JOIN perfis p ON p.id = a.denunciante_id;

GRANT SELECT ON ameacas_publicas TO anon, authenticated;

-- ═══ 3. FOTOS: servidor decide o status de moderação, não o cliente ═══

CREATE OR REPLACE FUNCTION public.fotos_status_servidor()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  -- Ignora o que vier do cliente: toda foto nasce aprovada e visível.
  -- (Se um dia quisermos revisão prévia, muda-se AQUI para 'pendente'.)
  NEW.status := 'aprovada';
  NEW.oculta := false;
  NEW.motivo_oculta := NULL;
  NEW.deleted_at := NULL;
  NEW.deleted_by := NULL;
  NEW.delete_reason := NULL;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.fotos_status_servidor() FROM anon, authenticated, public;

DROP TRIGGER IF EXISTS fotos_status_servidor_trg ON fotos;
CREATE TRIGGER fotos_status_servidor_trg
  BEFORE INSERT ON fotos
  FOR EACH ROW EXECUTE FUNCTION public.fotos_status_servidor();

-- ═══ 4. AVATARS: cada um só mexe na própria foto de perfil ═══
-- Antes, qualquer logado podia sobrescrever o avatar de qualquer pessoa
-- e usar o bucket público como hospedagem de arquivos.

DROP POLICY IF EXISTS "avatars upload" ON storage.objects;
DROP POLICY IF EXISTS "avatars update" ON storage.objects;
DROP POLICY IF EXISTS "avatars leitura" ON storage.objects;

-- Caminho obrigatório: avatars/<uid>/...  (o dono é a primeira pasta)
CREATE POLICY "avatars upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars leitura" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'avatars');

-- ═══ 5. Reaplica as policies de staff das migrations 0020/0021 ═══
-- Elas usavam CREATE POLICY IF NOT EXISTS, que o Postgres rejeita.
-- Aqui a versão válida (DROP + CREATE), idempotente.

-- perfis: admin exclui
DROP POLICY IF EXISTS perfis_admin_delete ON perfis;
CREATE POLICY perfis_admin_delete ON perfis FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM perfis pp WHERE pp.id = auth.uid() AND pp.papel IN ('admin', 'super_admin')));

-- mutiroes: staff enxerga todos, atualiza e exclui
DROP POLICY IF EXISTS mutiroes_staff_select ON mutiroes;
CREATE POLICY mutiroes_staff_select ON mutiroes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM perfis pp WHERE pp.id = auth.uid() AND pp.papel IN ('moderator', 'admin', 'super_admin')));

DROP POLICY IF EXISTS mutiroes_staff_update ON mutiroes;
CREATE POLICY mutiroes_staff_update ON mutiroes FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM perfis pp WHERE pp.id = auth.uid() AND pp.papel IN ('moderator', 'admin', 'super_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM perfis pp WHERE pp.id = auth.uid() AND pp.papel IN ('moderator', 'admin', 'super_admin')));

DROP POLICY IF EXISTS mutiroes_staff_delete ON mutiroes;
CREATE POLICY mutiroes_staff_delete ON mutiroes FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM perfis pp WHERE pp.id = auth.uid() AND pp.papel IN ('moderator', 'admin', 'super_admin')));

-- ameacas: moderador também exclui
DROP POLICY IF EXISTS ameacas_mod_delete ON ameacas;
CREATE POLICY ameacas_mod_delete ON ameacas FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM perfis pp WHERE pp.id = auth.uid() AND pp.papel IN ('moderator', 'admin', 'super_admin')));

-- denuncias: staff resolve; admin exclui
DROP POLICY IF EXISTS denuncias_staff_update ON denuncias;
CREATE POLICY denuncias_staff_update ON denuncias FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM perfis pp WHERE pp.id = auth.uid() AND pp.papel IN ('moderator', 'admin', 'super_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM perfis pp WHERE pp.id = auth.uid() AND pp.papel IN ('moderator', 'admin', 'super_admin')));

DROP POLICY IF EXISTS denuncias_admin_delete ON denuncias;
CREATE POLICY denuncias_admin_delete ON denuncias FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM perfis pp WHERE pp.id = auth.uid() AND pp.papel IN ('admin', 'super_admin')));

-- feed_dia: admin gerencia
DROP POLICY IF EXISTS feed_dia_staff_all ON feed_dia;
CREATE POLICY feed_dia_staff_all ON feed_dia FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM perfis pp WHERE pp.id = auth.uid() AND pp.papel IN ('admin', 'super_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM perfis pp WHERE pp.id = auth.uid() AND pp.papel IN ('admin', 'super_admin')));

-- rascunhos: admin exclui (de usuários removidos)
DROP POLICY IF EXISTS rascunhos_admin_delete ON rascunhos;
CREATE POLICY rascunhos_admin_delete ON rascunhos FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM perfis pp WHERE pp.id = auth.uid() AND pp.papel IN ('admin', 'super_admin')));

-- picos: admin edita e exclui
DROP POLICY IF EXISTS picos_admin_update ON picos;
CREATE POLICY picos_admin_update ON picos FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM perfis pp WHERE pp.id = auth.uid() AND pp.papel IN ('admin', 'super_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM perfis pp WHERE pp.id = auth.uid() AND pp.papel IN ('admin', 'super_admin')));

DROP POLICY IF EXISTS picos_admin_delete ON picos;
CREATE POLICY picos_admin_delete ON picos FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM perfis pp WHERE pp.id = auth.uid() AND pp.papel IN ('admin', 'super_admin')));

COMMIT;

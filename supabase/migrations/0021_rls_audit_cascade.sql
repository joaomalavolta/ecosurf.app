-- Auditoria de seguran\u00e7a: RLS completa + cascata de exclus\u00e3o

-- ═══ 1. RLS: Preencher lacunas ═══

-- mutiroes: staff precisa ver todos (inclusive cancelados) para moderar
CREATE POLICY IF NOT EXISTS mutiroes_staff_select ON mutiroes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM perfis pp WHERE pp.id = auth.uid() AND pp.papel IN ('moderator', 'admin', 'super_admin')));

-- mutiroes: staff pode alterar status (cancelar, etc)
CREATE POLICY IF NOT EXISTS mutiroes_staff_update ON mutiroes FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM perfis pp WHERE pp.id = auth.uid() AND pp.papel IN ('moderator', 'admin', 'super_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM perfis pp WHERE pp.id = auth.uid() AND pp.papel IN ('moderator', 'admin', 'super_admin')));

-- denuncias: staff pode resolver den\u00fancias
CREATE POLICY IF NOT EXISTS denuncias_staff_update ON denuncias FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM perfis pp WHERE pp.id = auth.uid() AND pp.papel IN ('moderator', 'admin', 'super_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM perfis pp WHERE pp.id = auth.uid() AND pp.papel IN ('moderator', 'admin', 'super_admin')));

-- denuncias: admin pode excluir
CREATE POLICY IF NOT EXISTS denuncias_admin_delete ON denuncias FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM perfis pp WHERE pp.id = auth.uid() AND pp.papel IN ('admin', 'super_admin')));

-- feed_dia: admin pode gerenciar
CREATE POLICY IF NOT EXISTS feed_dia_staff_all ON feed_dia FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM perfis pp WHERE pp.id = auth.uid() AND pp.papel IN ('admin', 'super_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM perfis pp WHERE pp.id = auth.uid() AND pp.papel IN ('admin', 'super_admin')));

-- ═══ 2. Cascata de exclus\u00e3o: quando um perfil \u00e9 exclu\u00eddo ═══
-- Decis\u00e3o: fotos ficam (anonimizadas). Alertas/mutir\u00f5es/rascunhos s\u00e3o exclu\u00eddos.
--
-- fotos.autor_id        → SET NULL  (foto fica como "an\u00f4nimo")
-- ameacas.denunciante_id → CASCADE  (alerta some junto)
-- mutiroes.organizador_id → CASCADE (mutir\u00e3o some junto)
-- rascunhos.user_id     → CASCADE  (rascunho some junto)
-- curtidas.autor_id     → CASCADE  (j\u00e1 estava correto)
-- denuncias.autor_id    → CASCADE  (j\u00e1 estava correto)
-- admin_logs.admin_id   → SET NULL  (log fica para auditoria)

ALTER TABLE ameacas DROP CONSTRAINT IF EXISTS ameacas_denunciante_id_fkey;
ALTER TABLE ameacas ADD CONSTRAINT ameacas_denunciante_id_fkey
  FOREIGN KEY (denunciante_id) REFERENCES perfis(id) ON DELETE CASCADE;

ALTER TABLE mutiroes DROP CONSTRAINT IF EXISTS mutiroes_organizador_id_fkey;
ALTER TABLE mutiroes ADD CONSTRAINT mutiroes_organizador_id_fkey
  FOREIGN KEY (organizador_id) REFERENCES perfis(id) ON DELETE CASCADE;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rascunhos' AND column_name = 'user_id') THEN
    ALTER TABLE rascunhos DROP CONSTRAINT IF EXISTS rascunhos_user_id_fkey;
    ALTER TABLE rascunhos ADD CONSTRAINT rascunhos_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES perfis(id) ON DELETE CASCADE;
  END IF;
END $$;

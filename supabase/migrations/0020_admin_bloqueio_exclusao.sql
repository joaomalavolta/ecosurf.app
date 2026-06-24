-- Painel Admin: coluna de bloqueio + pol\u00edticas de exclus\u00e3o/edi\u00e7\u00e3o de picos/mutir\u00f5es/perfis

-- 1) Coluna de bloqueio no perfil
ALTER TABLE perfis ADD COLUMN IF NOT EXISTS bloqueado_em timestamptz DEFAULT NULL;

-- 2) Admin pode excluir perfis
CREATE POLICY IF NOT EXISTS perfis_admin_delete ON perfis FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM perfis pp WHERE pp.id = auth.uid() AND pp.papel IN ('admin', 'super_admin')));

-- 3) Staff pode excluir mutir\u00f5es
CREATE POLICY IF NOT EXISTS mutiroes_staff_delete ON mutiroes FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM perfis pp WHERE pp.id = auth.uid() AND pp.papel IN ('moderator', 'admin', 'super_admin')));

-- 4) Admin pode excluir rascunhos de usu\u00e1rios exclu\u00eddos
CREATE POLICY IF NOT EXISTS rascunhos_admin_delete ON rascunhos FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM perfis pp WHERE pp.id = auth.uid() AND pp.papel IN ('admin', 'super_admin')));

-- 5) Moderadores podem excluir alertas (al\u00e9m do admin que j\u00e1 podia)
CREATE POLICY IF NOT EXISTS ameacas_mod_delete ON ameacas FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM perfis pp WHERE pp.id = auth.uid() AND pp.papel IN ('moderator', 'admin', 'super_admin')));

-- 6) Admin pode editar picos
CREATE POLICY IF NOT EXISTS picos_admin_update ON picos FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM perfis pp WHERE pp.id = auth.uid() AND pp.papel IN ('admin', 'super_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM perfis pp WHERE pp.id = auth.uid() AND pp.papel IN ('admin', 'super_admin')));

-- 7) Admin pode excluir picos
CREATE POLICY IF NOT EXISTS picos_admin_delete ON picos FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM perfis pp WHERE pp.id = auth.uid() AND pp.papel IN ('admin', 'super_admin')));

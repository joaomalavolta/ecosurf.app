-- ════════════════════════════════════════════════════════════════════════
-- 0034 — Quem reportou pode apagar (alerta e pico)
--  · Alerta: o denunciante apaga o próprio registro (vínculo com mutirões
--    sobrevive: FK alerta_id é ON DELETE SET NULL).
--  · Pico: o criador apaga SOMENTE se não houver fotos de outras pessoas.
--  · Picos antigos não têm autor (coluna nova): seguem só-admin.
-- ════════════════════════════════════════════════════════════════════════
ALTER TABLE picos ADD COLUMN IF NOT EXISTS criado_por uuid
  REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid();

CREATE OR REPLACE VIEW picos_publicos AS
SELECT id, nome, praia, regiao_surf_id, municipio, uf,
       orientacao_praia_deg, fundo, visibilidade, descricao,
       st_y(geom) AS lat, st_x(geom) AS lng,
       criado_por
FROM picos
WHERE visibilidade = 'publico'::text;

CREATE POLICY ameacas_author_delete ON ameacas
  FOR DELETE TO authenticated USING (denunciante_id = auth.uid());

CREATE POLICY picos_author_delete ON picos
  FOR DELETE TO authenticated
  USING (
    criado_por = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM fotos f
      WHERE f.pico_id = picos.id
        AND f.autor_id IS DISTINCT FROM auth.uid()
        AND f.deleted_at IS NULL
    )
  );

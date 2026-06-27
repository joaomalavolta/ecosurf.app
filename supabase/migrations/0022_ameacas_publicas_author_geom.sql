-- Update ameacas_publicas view to return exact coords for the author, and approx coords for public.
-- It also drops the leaky public policy and grants SELECT on ameacas directly so the frontend can UPDATE correctly.

BEGIN;

DROP POLICY IF EXISTS "ameacas_leitura_publica" ON ameacas;

GRANT SELECT ON ameacas TO authenticated, anon;

CREATE OR REPLACE VIEW ameacas_publicas AS
    SELECT a.id,
    a.titulo,
    a.categoria,
    a.status,
    a.gravidade,
    a.pico_id,
    a.municipio,
    a.uf,
    a.precisao,
    a.descricao,
    a.criada_em,
    a.local_nome,
    a.recorrente,
    a.images,
    CASE WHEN a.denunciante_id = auth.uid() THEN extensions.st_y(a.geom) ELSE extensions.st_y(a.geom_aprox) END AS lat,
    CASE WHEN a.denunciante_id = auth.uid() THEN extensions.st_x(a.geom) ELSE extensions.st_x(a.geom_aprox) END AS lng,
    a.denunciante_id AS autor_id,
    p.nome AS autor_nome,
    p.foto_url AS autor_foto
   FROM ameacas a
     LEFT JOIN perfis p ON p.id = a.denunciante_id;

COMMIT;

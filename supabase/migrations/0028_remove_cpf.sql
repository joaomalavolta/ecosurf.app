-- ════════════════════════════════════════════════════════════════════════
-- 0028 — Remoção do CPF (minimização de dados, LGPD)
--
-- Decisão de produto (2026-07): o CPF coletado nunca foi verificado contra a
-- Receita — validava apenas dígito verificador —, então não entregava o
-- anti-fraude que prometia, e criava passivo LGPD (Art. 6º, minimização).
-- O anti-fake real do Ecosurf é o sistema de procedência (selo "no local",
-- validação de geolocalização no servidor) e a autoria pública.
--
-- Esta migration apaga os CPFs existentes e remove a coluna. Irreversível
-- por design: dado que não existe não vaza.
-- ════════════════════════════════════════════════════════════════════════

BEGIN;

-- Apaga os valores antes de remover a coluna (explícito, para o log contar a história).
UPDATE perfis SET cpf = NULL WHERE cpf IS NOT NULL;

ALTER TABLE perfis DROP COLUMN IF EXISTS cpf;

COMMIT;

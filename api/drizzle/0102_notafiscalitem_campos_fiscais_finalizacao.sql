-- Colunas consumidas pela finalização da nota fiscal de entrada.
-- Reaplica de forma idempotente o contrato da migration 0088 para ambientes
-- cujo deploy histórico não executou aquela migration.
ALTER TABLE "notafiscalitem"
	ADD COLUMN IF NOT EXISTS "basepis" numeric(12, 2),
	ADD COLUMN IF NOT EXISTS "basecofins" numeric(12, 2),
	ADD COLUMN IF NOT EXISTS "baseicmsst" numeric(12, 2),
	ADD COLUMN IF NOT EXISTS "valoricmsst" numeric(12, 2),
	ADD COLUMN IF NOT EXISTS "aliquotaicmsst" numeric(7, 4),
	ADD COLUMN IF NOT EXISTS "basefcp" numeric(12, 2),
	ADD COLUMN IF NOT EXISTS "valorfcp" numeric(12, 2),
	ADD COLUMN IF NOT EXISTS "valorfcpst" numeric(12, 2),
	ADD COLUMN IF NOT EXISTS "cest" varchar(7),
	ADD COLUMN IF NOT EXISTS "gerarcreditoipi" smallint,
	ADD COLUMN IF NOT EXISTS "gerarcreditoicmsst" smallint;

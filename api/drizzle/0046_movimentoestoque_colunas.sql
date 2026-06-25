ALTER TABLE "movimentoestoque"
	ADD COLUMN IF NOT EXISTS "customedio" numeric(15, 6);

ALTER TABLE "movimentoestoque"
	ADD COLUMN IF NOT EXISTS "pontoequilibrio" numeric(15, 6);

ALTER TABLE "movimentoestoque"
	ADD COLUMN IF NOT EXISTS "precocusto" numeric(15, 6);

ALTER TABLE "movimentoestoque"
	ADD COLUMN IF NOT EXISTS "precoultimacompra" numeric(12, 2);

ALTER TABLE "movimentoestoque"
	ADD COLUMN IF NOT EXISTS "quantidadeentrada" numeric(15, 6);

ALTER TABLE "movimentoestoque"
	ADD COLUMN IF NOT EXISTS "quantidadesaida" numeric(15, 6);

ALTER TABLE "movimentoestoque"
	ADD COLUMN IF NOT EXISTS "valortotal" numeric(12, 2);

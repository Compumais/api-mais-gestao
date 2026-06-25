ALTER TABLE "saldoestoque"
	ADD COLUMN IF NOT EXISTS "quantidadefiscal" numeric(18, 6) DEFAULT '0' NOT NULL;

ALTER TABLE "movimentoestoque"
	ADD COLUMN IF NOT EXISTS "tipoestoque" smallint DEFAULT 0 NOT NULL;

CREATE INDEX IF NOT EXISTS "movimentoestoque_empresa_produto_tipoestoque_idx"
	ON "movimentoestoque" ("idempresa", "idproduto", "tipoestoque");

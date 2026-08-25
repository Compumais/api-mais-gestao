ALTER TABLE "cotacaocompraitem" ALTER COLUMN "idproduto" DROP NOT NULL;
ALTER TABLE "cotacaocompraitem" ADD COLUMN IF NOT EXISTS "descricao" varchar(120);

UPDATE "cotacaocompraitem" i
SET "descricao" = coalesce(p.descricao, p.nome)
FROM "produtos" p
WHERE i.idproduto = p.id
  AND i.descricao IS NULL;

DROP INDEX IF EXISTS "cotacaocompraitem_cotacao_produto_uidx";
CREATE UNIQUE INDEX IF NOT EXISTS "cotacaocompraitem_cotacao_produto_uidx"
	ON "cotacaocompraitem" ("idcotacao", "idproduto")
	WHERE "idproduto" IS NOT NULL;

ALTER TABLE "pedidocompraitem" ALTER COLUMN "idproduto" DROP NOT NULL;
ALTER TABLE "pedidocompraitem" ADD COLUMN IF NOT EXISTS "descricao" varchar(120);

UPDATE "pedidocompraitem" i
SET "descricao" = coalesce(p.descricao, p.nome)
FROM "produtos" p
WHERE i.idproduto = p.id
  AND i.descricao IS NULL;

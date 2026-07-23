ALTER TABLE "parametrizacaotributos"
ADD COLUMN IF NOT EXISTS "tipoproduto" varchar(2);

UPDATE "parametrizacaotributos"
SET "tipoproduto" = '00'
WHERE "tipoproduto" IS NULL OR trim("tipoproduto") = '';

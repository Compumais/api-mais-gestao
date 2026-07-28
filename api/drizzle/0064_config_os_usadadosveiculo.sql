ALTER TABLE "configuracaoordemservico" ADD COLUMN "usadadosveiculo" smallint DEFAULT 1;
UPDATE "configuracaoordemservico" SET "usadadosveiculo" = 1 WHERE "usadadosveiculo" IS NULL;

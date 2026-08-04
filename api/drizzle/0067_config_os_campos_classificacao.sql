ALTER TABLE "configuracaoordemservico" ADD COLUMN "usaarea" smallint DEFAULT 1;
ALTER TABLE "configuracaoordemservico" ADD COLUMN "usaobjeto" smallint DEFAULT 1;
ALTER TABLE "configuracaoordemservico" ADD COLUMN "usatipoproblema" smallint DEFAULT 1;

UPDATE "configuracaoordemservico" SET "usaarea" = 1 WHERE "usaarea" IS NULL;
UPDATE "configuracaoordemservico" SET "usaobjeto" = 1 WHERE "usaobjeto" IS NULL;
UPDATE "configuracaoordemservico" SET "usatipoproblema" = 1 WHERE "usatipoproblema" IS NULL;

CREATE TABLE IF NOT EXISTS "budget" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"idplanocontas" text NOT NULL,
	"ano" integer NOT NULL,
	"periodicidade" char(1) NOT NULL,
	"mes" smallint,
	"valor" numeric(12, 2) NOT NULL,
	"currenttimemillis" bigint
);

CREATE INDEX IF NOT EXISTS "budget_idempresa_idx" ON "budget" ("idempresa");
CREATE INDEX IF NOT EXISTS "budget_idplanocontas_idx" ON "budget" ("idplanocontas");
CREATE UNIQUE INDEX IF NOT EXISTS "budget_empresa_conta_periodo_uidx"
	ON "budget" ("idempresa", "idplanocontas", "ano", COALESCE("mes", 0));

ALTER TABLE "budget"
ADD CONSTRAINT "budget_idempresa_fkey"
FOREIGN KEY ("idempresa") REFERENCES "public"."empresas"("id")
ON DELETE cascade ON UPDATE cascade;

ALTER TABLE "budget"
ADD CONSTRAINT "budget_idplanocontas_fkey"
FOREIGN KEY ("idplanocontas") REFERENCES "public"."planocontas"("id")
ON DELETE restrict ON UPDATE cascade;

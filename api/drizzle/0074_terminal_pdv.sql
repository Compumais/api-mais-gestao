CREATE TABLE IF NOT EXISTS "terminalpdv" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"numeropdv" integer NOT NULL,
	"descricao" varchar(120),
	"idnfeserie" text NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"criadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"atualizadoem" timestamp(3) NOT NULL
);

ALTER TABLE "terminalpdv"
	ADD CONSTRAINT "terminalpdv_numeropdv_check"
	CHECK ("numeropdv" >= 1 AND "numeropdv" <= 999);

CREATE UNIQUE INDEX IF NOT EXISTS "terminalpdv_empresa_numeropdv_key"
	ON "terminalpdv" ("idempresa", "numeropdv");
CREATE UNIQUE INDEX IF NOT EXISTS "terminalpdv_idnfeserie_key"
	ON "terminalpdv" ("idnfeserie");
CREATE INDEX IF NOT EXISTS "terminalpdv_idempresa_idx"
	ON "terminalpdv" ("idempresa");

DO $$ BEGIN
 ALTER TABLE "terminalpdv" ADD CONSTRAINT "terminalpdv_idempresa_fkey" FOREIGN KEY ("idempresa") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "terminalpdv" ADD CONSTRAINT "terminalpdv_idnfeserie_fkey" FOREIGN KEY ("idnfeserie") REFERENCES "public"."nfeserie"("id") ON DELETE restrict ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

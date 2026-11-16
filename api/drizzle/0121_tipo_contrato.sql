CREATE TABLE IF NOT EXISTS "tipocontrato" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"codigo" integer NOT NULL,
	"descricao" varchar(120) NOT NULL,
	"valor" numeric(12, 2) NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tipocontrato" ADD CONSTRAINT "fk_tipocontrato_empresa" FOREIGN KEY ("idempresa") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "contrato" ADD COLUMN IF NOT EXISTS "idtipocontrato" text;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contrato" ADD CONSTRAINT "contrato_idtipocontrato_fkey" FOREIGN KEY ("idtipocontrato") REFERENCES "public"."tipocontrato"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

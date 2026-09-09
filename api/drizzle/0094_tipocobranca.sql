CREATE TABLE IF NOT EXISTS "tipocobranca" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"codigo" integer NOT NULL,
	"descricao" varchar(120) NOT NULL,
	"idtipodocumentofinanceiro" text NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "tipocobranca"
		ADD CONSTRAINT "fk_tipocobranca_empresa"
		FOREIGN KEY ("idempresa") REFERENCES "public"."empresas"("id")
		ON DELETE no action ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "tipocobranca"
		ADD CONSTRAINT "fk_tipocobranca_tipodocumentofinanceiro"
		FOREIGN KEY ("idtipodocumentofinanceiro")
		REFERENCES "public"."tipodocumentofinanceiro"("id")
		ON DELETE no action ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "financeiro"
		ADD CONSTRAINT "financeiro_idtipocobranca_fkey"
		FOREIGN KEY ("idtipocobranca") REFERENCES "public"."tipocobranca"("id")
		ON DELETE set null ON UPDATE cascade;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;

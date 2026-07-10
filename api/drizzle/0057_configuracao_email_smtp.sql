CREATE TABLE IF NOT EXISTS "configuracaoemailsmtp" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"host" varchar(200) NOT NULL,
	"porta" integer DEFAULT 587 NOT NULL,
	"seguro" boolean DEFAULT true NOT NULL,
	"usuario" varchar(200) NOT NULL,
	"senha" text NOT NULL,
	"emailremetente" varchar(200) NOT NULL,
	"nomremetente" varchar(120),
	"ativo" boolean DEFAULT true NOT NULL,
	"criadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"atualizadoem" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "configuracaoemailsmtp_idempresa_key"
	ON "configuracaoemailsmtp" ("idempresa");
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'configuracaoemailsmtp_idempresa_fkey'
	) THEN
		ALTER TABLE "configuracaoemailsmtp"
			ADD CONSTRAINT "configuracaoemailsmtp_idempresa_fkey"
			FOREIGN KEY ("idempresa") REFERENCES "empresas"("id")
			ON DELETE cascade ON UPDATE cascade;
	END IF;
END $$;

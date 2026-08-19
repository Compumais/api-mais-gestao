CREATE TABLE IF NOT EXISTS "dominiointegracao" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"habilitado" boolean DEFAULT false NOT NULL,
	"chavecontador" text,
	"integrationkey" text,
	"boxefile" boolean DEFAULT false NOT NULL,
	"nomeescritorio" varchar(200),
	"nomecliente" varchar(200),
	"cnpjcliente" varchar(18),
	"ultimoerro" text,
	"ativadoem" timestamp(3),
	"criadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"atualizadoem" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "dominiointegracao_idempresa_key"
	ON "dominiointegracao" ("idempresa");
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'dominiointegracao_idempresa_fkey'
	) THEN
		ALTER TABLE "dominiointegracao"
			ADD CONSTRAINT "dominiointegracao_idempresa_fkey"
			FOREIGN KEY ("idempresa") REFERENCES "empresas"("id")
			ON DELETE cascade ON UPDATE cascade;
	END IF;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dominioenvio" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"idnotafiscal" text NOT NULL,
	"tipo" varchar(20) NOT NULL,
	"status" varchar(40) NOT NULL,
	"idloteapi" varchar(80),
	"tentativas" integer DEFAULT 0 NOT NULL,
	"proximatentativa" timestamp(3),
	"mensagemretorno" text,
	"criadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"atualizadoem" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "dominioenvio_idnotafiscal_tipo_key"
	ON "dominioenvio" ("idnotafiscal", "tipo");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dominioenvio_idempresa_idx"
	ON "dominioenvio" ("idempresa");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dominioenvio_status_proxima_idx"
	ON "dominioenvio" ("status", "proximatentativa");
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'dominioenvio_idempresa_fkey'
	) THEN
		ALTER TABLE "dominioenvio"
			ADD CONSTRAINT "dominioenvio_idempresa_fkey"
			FOREIGN KEY ("idempresa") REFERENCES "empresas"("id")
			ON DELETE cascade ON UPDATE cascade;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'dominioenvio_idnotafiscal_fkey'
	) THEN
		ALTER TABLE "dominioenvio"
			ADD CONSTRAINT "dominioenvio_idnotafiscal_fkey"
			FOREIGN KEY ("idnotafiscal") REFERENCES "notafiscal"("id")
			ON DELETE cascade ON UPDATE cascade;
	END IF;
END $$;

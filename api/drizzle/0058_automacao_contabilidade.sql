CREATE TABLE IF NOT EXISTS "contabilidadeempresa" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"nome" varchar(200) NOT NULL,
	"cnpj" varchar(18),
	"emailprincipal" varchar(200) NOT NULL,
	"emailsadicionais" jsonb,
	"ativo" boolean DEFAULT true NOT NULL,
	"criadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"atualizadoem" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "contabilidadeempresa_idempresa_key"
	ON "contabilidadeempresa" ("idempresa");
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'contabilidadeempresa_idempresa_fkey'
	) THEN
		ALTER TABLE "contabilidadeempresa"
			ADD CONSTRAINT "contabilidadeempresa_idempresa_fkey"
			FOREIGN KEY ("idempresa") REFERENCES "empresas"("id")
			ON DELETE cascade ON UPDATE cascade;
	END IF;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "automacao" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"nome" varchar(120) NOT NULL,
	"funcao" varchar(80) NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"recorrencia" varchar(20) NOT NULL,
	"horario" varchar(5) NOT NULL DEFAULT '08:00',
	"diames" smallint,
	"diasemana" smallint,
	"parametros" jsonb,
	"proximaexecucao" timestamp(3),
	"ultimaexecucao" timestamp(3),
	"statusultima" varchar(30),
	"criadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"atualizadoem" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "automacao_idempresa_idx"
	ON "automacao" ("idempresa");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "automacao_proximaexecucao_idx"
	ON "automacao" ("proximaexecucao")
	WHERE "ativo" = true;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'automacao_idempresa_fkey'
	) THEN
		ALTER TABLE "automacao"
			ADD CONSTRAINT "automacao_idempresa_fkey"
			FOREIGN KEY ("idempresa") REFERENCES "empresas"("id")
			ON DELETE cascade ON UPDATE cascade;
	END IF;
END $$;

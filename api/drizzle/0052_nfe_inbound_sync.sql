CREATE TABLE IF NOT EXISTS "nfeinbounddocumento" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"nsu" varchar(15) NOT NULL,
	"chavenfe" varchar(44) NOT NULL,
	"tipodocumento" varchar(20) NOT NULL,
	"cnpjemitente" varchar(14),
	"razaoemitente" varchar(255),
	"numero" integer,
	"serie" smallint,
	"dataemissao" timestamp(3),
	"valortotal" numeric(15, 2),
	"xml" text,
	"statusmanifestacao" varchar(30) DEFAULT 'sem_manifestacao' NOT NULL,
	"statusimportacao" varchar(30) DEFAULT 'aguardando_xml' NOT NULL,
	"idrascunho" text,
	"criadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"atualizadoem" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "nfeinbounddocumento_idempresa_chavenfe_uidx" ON "nfeinbounddocumento" ("idempresa", "chavenfe");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nfeinbounddocumento_idempresa_criadoem_idx" ON "nfeinbounddocumento" ("idempresa", "criadoem");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nfeinbounddocumento_statusimportacao_idx" ON "nfeinbounddocumento" ("statusimportacao");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "empresanfesync" (
	"idempresa" text PRIMARY KEY NOT NULL,
	"ultimonsu" varchar(15) DEFAULT '0' NOT NULL,
	"maxnsu" varchar(15),
	"ultimosync" timestamp(3),
	"proximotentativa" timestamp(3),
	"sincronizando" boolean DEFAULT false NOT NULL,
	"importacaoautomatica" boolean DEFAULT false NOT NULL,
	"tentativasbackoff" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nfeinbounddocumento" ADD CONSTRAINT "nfeinbounddocumento_idempresa_fkey" FOREIGN KEY ("idempresa") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nfeinbounddocumento" ADD CONSTRAINT "nfeinbounddocumento_idrascunho_fkey" FOREIGN KEY ("idrascunho") REFERENCES "public"."notafiscal"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "empresanfesync" ADD CONSTRAINT "empresanfesync_idempresa_fkey" FOREIGN KEY ("idempresa") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "configuracao_pdv" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"modeloatendimento" varchar(10) DEFAULT 'mesa' NOT NULL,
	"etiquetabalancahabilitada" smallint DEFAULT 0 NOT NULL,
	"etiquetabalancaprefixo" varchar(1) DEFAULT '2' NOT NULL,
	"etiquetabalancadigitoscodigo" smallint DEFAULT 4 NOT NULL,
	"etiquetabalancaconteudo" varchar(10) DEFAULT 'preco' NOT NULL,
	"etiquetabalancacentavos" smallint DEFAULT 1 NOT NULL,
	"etiquetabalancaindicadoruso" smallint DEFAULT 0 NOT NULL,
	"atualizadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "configuracao_pdv_idempresa_fkey" FOREIGN KEY ("idempresa") REFERENCES "empresas"("id") ON DELETE cascade ON UPDATE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "configuracao_pdv_idempresa_key" ON "configuracao_pdv" ("idempresa");

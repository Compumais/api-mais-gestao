CREATE TABLE IF NOT EXISTS "nfceconfiguracao" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"ambiente" smallint DEFAULT 2 NOT NULL,
	"versaoleiaute" varchar(10) DEFAULT '4.00' NOT NULL,
	"schema" varchar(30) DEFAULT 'PL_009_V4' NOT NULL,
	"idcertificadoativo" text,
	"verproc" varchar(20) DEFAULT 'MaisGestao 1.0.0',
	"idcsc_homologacao" varchar(6),
	"csctoken_homologacao" varchar(36),
	"idcsc_producao" varchar(6),
	"csctoken_producao" varchar(36),
	"contingenciaativa" boolean DEFAULT false NOT NULL,
	"contingenciajson" jsonb DEFAULT '{}'::jsonb,
	"ultimaidserie" text,
	"criadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"atualizadoem" timestamp(3) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "nfceconfiguracao_idempresa_key" ON "nfceconfiguracao" ("idempresa");

ALTER TABLE "nfceconfiguracao"
	ADD CONSTRAINT "nfceconfiguracao_idempresa_fkey"
	FOREIGN KEY ("idempresa") REFERENCES "empresas"("id")
	ON UPDATE cascade ON DELETE cascade;

ALTER TABLE "nfceconfiguracao"
	ADD CONSTRAINT "nfceconfiguracao_idcertificadoativo_fkey"
	FOREIGN KEY ("idcertificadoativo") REFERENCES "certificadodigital"("id")
	ON UPDATE cascade ON DELETE set null;

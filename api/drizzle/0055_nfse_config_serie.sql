CREATE TABLE IF NOT EXISTS "nfseconfiguracao" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"ambiente" smallint DEFAULT 2 NOT NULL,
	"provedor" varchar(20) DEFAULT 'abrasf' NOT NULL,
	"codigomunicipioibge" varchar(7),
	"versaolayout" varchar(10) DEFAULT '2.02' NOT NULL,
	"urlwsdl" varchar(500),
	"usarlotesincrono" boolean DEFAULT true NOT NULL,
	"idcertificadoativo" text,
	"ultimaidserie" text,
	"criadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"atualizadoem" timestamp(3) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "nfseconfiguracao_idempresa_key" ON "nfseconfiguracao" ("idempresa");

ALTER TABLE "nfseconfiguracao" ADD CONSTRAINT "nfseconfiguracao_idempresa_fkey" FOREIGN KEY ("idempresa") REFERENCES "empresas"("id") ON DELETE cascade ON UPDATE cascade;

ALTER TABLE "nfseconfiguracao" ADD CONSTRAINT "nfseconfiguracao_idcertificadoativo_fkey" FOREIGN KEY ("idcertificadoativo") REFERENCES "certificadodigital"("id") ON DELETE set null ON UPDATE cascade;

CREATE TABLE IF NOT EXISTS "nfseserie" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"serie" varchar(5) DEFAULT '1' NOT NULL,
	"numeroproximo" integer DEFAULT 1 NOT NULL,
	"padrao" boolean DEFAULT false NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"criadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"atualizadoem" timestamp(3) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "nfseserie_empresa_serie_key" ON "nfseserie" ("idempresa", "serie");

CREATE INDEX IF NOT EXISTS "nfseserie_idempresa_idx" ON "nfseserie" ("idempresa");

ALTER TABLE "nfseserie" ADD CONSTRAINT "nfseserie_idempresa_fkey" FOREIGN KEY ("idempresa") REFERENCES "empresas"("id") ON DELETE cascade ON UPDATE cascade;

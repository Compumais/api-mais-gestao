CREATE TABLE IF NOT EXISTS "empresafiscal" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"razaosocial" varchar(60),
	"nomefantasia" varchar(60),
	"inscricaoestadual" varchar(20),
	"inscricaomunicipal" varchar(20),
	"crt" smallint,
	"cnae" varchar(7),
	"indicadorie" smallint DEFAULT 1,
	"logradouro" varchar(60),
	"numero" varchar(10),
	"complemento" varchar(60),
	"bairro" varchar(60),
	"cep" varchar(9),
	"codigomunicipioibge" varchar(7),
	"uf" char(2),
	"codigopais" varchar(4) DEFAULT '1058',
	"telefone" varchar(40),
	"email" varchar(200),
	"regimetributario" varchar(2),
	"criadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"atualizadoem" timestamp(3) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "empresafiscal_idempresa_key" ON "empresafiscal" ("idempresa");

ALTER TABLE "empresafiscal"
	ADD CONSTRAINT "empresafiscal_idempresa_fkey"
	FOREIGN KEY ("idempresa") REFERENCES "empresas"("id")
	ON UPDATE cascade ON DELETE cascade;

CREATE TABLE IF NOT EXISTS "certificadodigital" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"apelido" varchar(100) NOT NULL,
	"cnpjcertificado" varchar(14) NOT NULL,
	"arquivopfxcriptografado" text NOT NULL,
	"senhacriptografada" text NOT NULL,
	"validadeinicio" timestamp(3),
	"validadefim" timestamp(3),
	"serial" varchar(100),
	"thumbprint" varchar(100),
	"ativo" boolean DEFAULT false NOT NULL,
	"criadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"atualizadoem" timestamp(3) NOT NULL
);

CREATE INDEX IF NOT EXISTS "certificadodigital_idempresa_idx" ON "certificadodigital" ("idempresa");

ALTER TABLE "certificadodigital"
	ADD CONSTRAINT "certificadodigital_idempresa_fkey"
	FOREIGN KEY ("idempresa") REFERENCES "empresas"("id")
	ON UPDATE cascade ON DELETE cascade;

CREATE TABLE IF NOT EXISTS "nfeconfiguracao" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"ambiente" smallint DEFAULT 2 NOT NULL,
	"versaoleiaute" varchar(10) DEFAULT '4.00' NOT NULL,
	"schema" varchar(30) DEFAULT 'PL_009_V4' NOT NULL,
	"idcertificadoativo" text,
	"verproc" varchar(20) DEFAULT 'MaisGestao 1.0.0',
	"tokenibpt" varchar(100),
	"emailenvioxml" varchar(200),
	"infresptec_cnpj" varchar(14),
	"infresptec_nome" varchar(60),
	"infresptec_email" varchar(200),
	"infresptec_fone" varchar(20),
	"contingenciaativa" boolean DEFAULT false NOT NULL,
	"contingenciajson" jsonb DEFAULT '{}'::jsonb,
	"criadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"atualizadoem" timestamp(3) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "nfeconfiguracao_idempresa_key" ON "nfeconfiguracao" ("idempresa");

ALTER TABLE "nfeconfiguracao"
	ADD CONSTRAINT "nfeconfiguracao_idempresa_fkey"
	FOREIGN KEY ("idempresa") REFERENCES "empresas"("id")
	ON UPDATE cascade ON DELETE cascade;

CREATE TABLE IF NOT EXISTS "nfeserie" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"modelo" varchar(2) DEFAULT '55' NOT NULL,
	"serie" varchar(3) NOT NULL,
	"numeroproximo" integer DEFAULT 1 NOT NULL,
	"padrao" boolean DEFAULT false NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"criadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"atualizadoem" timestamp(3) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "nfeserie_empresa_modelo_serie_key" ON "nfeserie" ("idempresa", "modelo", "serie");
CREATE INDEX IF NOT EXISTS "nfeserie_idempresa_idx" ON "nfeserie" ("idempresa");

ALTER TABLE "nfeserie"
	ADD CONSTRAINT "nfeserie_idempresa_fkey"
	FOREIGN KEY ("idempresa") REFERENCES "empresas"("id")
	ON UPDATE cascade ON DELETE cascade;

ALTER TABLE "nfeconfiguracao"
	ADD CONSTRAINT "nfeconfiguracao_idcertificadoativo_fkey"
	FOREIGN KEY ("idcertificadoativo") REFERENCES "certificadodigital"("id")
	ON UPDATE cascade ON DELETE set null;

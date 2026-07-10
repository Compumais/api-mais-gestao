CREATE TABLE IF NOT EXISTS "servicosnfse" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text,
	"codigo" varchar(10) NOT NULL,
	"descricao" text NOT NULL,
	"restrito" varchar(3),
	"codigotributacao" varchar(20),
	"codigoextra" varchar(20),
	"inativo" smallint DEFAULT 0 NOT NULL,
	"criadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"atualizadoem" timestamp(3) NOT NULL
);

CREATE INDEX IF NOT EXISTS "servicosnfse_idempresa_idx" ON "servicosnfse" ("idempresa");

CREATE INDEX IF NOT EXISTS "servicosnfse_codigo_idx" ON "servicosnfse" ("codigo");

CREATE UNIQUE INDEX IF NOT EXISTS "servicosnfse_empresa_codigo_key" ON "servicosnfse" ("idempresa", "codigo");

CREATE UNIQUE INDEX IF NOT EXISTS "servicosnfse_codigo_global_key" ON "servicosnfse" ("codigo") WHERE "idempresa" IS NULL;

ALTER TABLE "servicosnfse" ADD CONSTRAINT "servicosnfse_idempresa_fkey" FOREIGN KEY ("idempresa") REFERENCES "empresas"("id") ON DELETE cascade ON UPDATE cascade;

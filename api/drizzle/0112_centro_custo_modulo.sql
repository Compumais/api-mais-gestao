ALTER TABLE "centrocusto" ADD COLUMN IF NOT EXISTS "descricao" text;
ALTER TABLE "centrocusto" ADD COLUMN IF NOT EXISTS "iddepartamento" text;
ALTER TABLE "centrocusto" ADD COLUMN IF NOT EXISTS "idresponsavel" text;
ALTER TABLE "centrocusto" ADD COLUMN IF NOT EXISTS "datainiciovigencia" date;
ALTER TABLE "centrocusto" ADD COLUMN IF NOT EXISTS "datafimvigencia" date;
ALTER TABLE "centrocusto" ADD COLUMN IF NOT EXISTS "tipogestao" char(3);
ALTER TABLE "centrocusto" ADD COLUMN IF NOT EXISTS "observacao" text;

CREATE INDEX IF NOT EXISTS "centrocusto_idempresa_inativo_idx"
	ON "centrocusto" ("idempresa", "inativo");
CREATE INDEX IF NOT EXISTS "centrocusto_idempresa_tipogestao_idx"
	ON "centrocusto" ("idempresa", "tipogestao");

ALTER TABLE "centrocusto"
ADD CONSTRAINT "centrocusto_iddepartamento_fkey"
FOREIGN KEY ("iddepartamento") REFERENCES "public"."departamento"("id")
ON DELETE set null ON UPDATE cascade;

ALTER TABLE "centrocusto"
ADD CONSTRAINT "centrocusto_idresponsavel_fkey"
FOREIGN KEY ("idresponsavel") REFERENCES "public"."usuarios"("id")
ON DELETE set null ON UPDATE cascade;

CREATE TABLE IF NOT EXISTS "criterio_rateio" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"nome" varchar(80) NOT NULL,
	"tipoparametro" varchar(20) NOT NULL,
	"ativo" integer DEFAULT 1,
	"observacao" text,
	"idusuariocadastro" text NOT NULL,
	"idultimousuarioalteracao" text NOT NULL,
	"datacadastro" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"dataultimaalteracao" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS "criterio_rateio_idempresa_idx" ON "criterio_rateio" ("idempresa");

ALTER TABLE "criterio_rateio"
ADD CONSTRAINT "criterio_rateio_idempresa_fkey"
FOREIGN KEY ("idempresa") REFERENCES "public"."empresas"("id")
ON DELETE cascade ON UPDATE cascade;

ALTER TABLE "criterio_rateio"
ADD CONSTRAINT "criterio_rateio_idusuariocadastro_fkey"
FOREIGN KEY ("idusuariocadastro") REFERENCES "public"."usuarios"("id")
ON DELETE restrict ON UPDATE cascade;

ALTER TABLE "criterio_rateio"
ADD CONSTRAINT "criterio_rateio_idultimousuarioalteracao_fkey"
FOREIGN KEY ("idultimousuarioalteracao") REFERENCES "public"."usuarios"("id")
ON DELETE restrict ON UPDATE cascade;

CREATE TABLE IF NOT EXISTS "criterio_rateio_linha" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"idcriteriorateio" text NOT NULL,
	"idcentrocusto" text NOT NULL,
	"percentual" numeric(5, 2),
	"peso" numeric(12, 4),
	"ordem" integer DEFAULT 0
);

CREATE INDEX IF NOT EXISTS "criterio_rateio_linha_criterio_idx"
	ON "criterio_rateio_linha" ("idcriteriorateio");

ALTER TABLE "criterio_rateio_linha"
ADD CONSTRAINT "criterio_rateio_linha_idempresa_fkey"
FOREIGN KEY ("idempresa") REFERENCES "public"."empresas"("id")
ON DELETE cascade ON UPDATE cascade;

ALTER TABLE "criterio_rateio_linha"
ADD CONSTRAINT "criterio_rateio_linha_idcriteriorateio_fkey"
FOREIGN KEY ("idcriteriorateio") REFERENCES "public"."criterio_rateio"("id")
ON DELETE cascade ON UPDATE cascade;

ALTER TABLE "criterio_rateio_linha"
ADD CONSTRAINT "criterio_rateio_linha_idcentrocusto_fkey"
FOREIGN KEY ("idcentrocusto") REFERENCES "public"."centrocusto"("id")
ON DELETE restrict ON UPDATE cascade;

CREATE TABLE IF NOT EXISTS "apropriacao_centro_custo" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"idcentrocusto" text NOT NULL,
	"origemtipo" varchar(40) NOT NULL,
	"origemid" text NOT NULL,
	"valor" numeric(12, 2) NOT NULL,
	"percentual" numeric(5, 2),
	"idcriteriorateio" text,
	"regime" varchar(12) NOT NULL,
	"datalancamento" date NOT NULL,
	"idplanocontas" text,
	"referenciaexterna" varchar(120),
	"idusuariocadastro" text NOT NULL,
	"datacadastro" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "apropriacao_centro_custo_valor_positivo" CHECK ("valor" > 0)
);

CREATE INDEX IF NOT EXISTS "apropriacao_cc_empresa_centro_data_idx"
	ON "apropriacao_centro_custo" ("idempresa", "idcentrocusto", "datalancamento");
CREATE INDEX IF NOT EXISTS "apropriacao_cc_origem_idx"
	ON "apropriacao_centro_custo" ("origemtipo", "origemid");
CREATE INDEX IF NOT EXISTS "apropriacao_cc_empresa_plano_idx"
	ON "apropriacao_centro_custo" ("idempresa", "idplanocontas");

ALTER TABLE "apropriacao_centro_custo"
ADD CONSTRAINT "apropriacao_centro_custo_idempresa_fkey"
FOREIGN KEY ("idempresa") REFERENCES "public"."empresas"("id")
ON DELETE cascade ON UPDATE cascade;

ALTER TABLE "apropriacao_centro_custo"
ADD CONSTRAINT "apropriacao_centro_custo_idcentrocusto_fkey"
FOREIGN KEY ("idcentrocusto") REFERENCES "public"."centrocusto"("id")
ON DELETE restrict ON UPDATE cascade;

ALTER TABLE "apropriacao_centro_custo"
ADD CONSTRAINT "apropriacao_centro_custo_idcriteriorateio_fkey"
FOREIGN KEY ("idcriteriorateio") REFERENCES "public"."criterio_rateio"("id")
ON DELETE set null ON UPDATE cascade;

ALTER TABLE "apropriacao_centro_custo"
ADD CONSTRAINT "apropriacao_centro_custo_idplanocontas_fkey"
FOREIGN KEY ("idplanocontas") REFERENCES "public"."planocontas"("id")
ON DELETE set null ON UPDATE cascade;

ALTER TABLE "apropriacao_centro_custo"
ADD CONSTRAINT "apropriacao_centro_custo_idusuariocadastro_fkey"
FOREIGN KEY ("idusuariocadastro") REFERENCES "public"."usuarios"("id")
ON DELETE restrict ON UPDATE cascade;

CREATE TABLE IF NOT EXISTS "budget_centro_custo" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"idcentrocusto" text NOT NULL,
	"idplanocontas" text,
	"ano" integer NOT NULL,
	"periodicidade" char(1) NOT NULL,
	"mes" smallint,
	"valor" numeric(12, 2) NOT NULL,
	"currenttimemillis" bigint
);

CREATE INDEX IF NOT EXISTS "budget_centro_custo_idempresa_idx"
	ON "budget_centro_custo" ("idempresa");
CREATE INDEX IF NOT EXISTS "budget_centro_custo_idcentrocusto_idx"
	ON "budget_centro_custo" ("idcentrocusto");
CREATE UNIQUE INDEX IF NOT EXISTS "budget_centro_custo_empresa_cc_periodo_uidx"
	ON "budget_centro_custo" ("idempresa", "idcentrocusto", COALESCE("idplanocontas", ''), "ano", COALESCE("mes", 0));

ALTER TABLE "budget_centro_custo"
ADD CONSTRAINT "budget_centro_custo_idempresa_fkey"
FOREIGN KEY ("idempresa") REFERENCES "public"."empresas"("id")
ON DELETE cascade ON UPDATE cascade;

ALTER TABLE "budget_centro_custo"
ADD CONSTRAINT "budget_centro_custo_idcentrocusto_fkey"
FOREIGN KEY ("idcentrocusto") REFERENCES "public"."centrocusto"("id")
ON DELETE restrict ON UPDATE cascade;

ALTER TABLE "budget_centro_custo"
ADD CONSTRAINT "budget_centro_custo_idplanocontas_fkey"
FOREIGN KEY ("idplanocontas") REFERENCES "public"."planocontas"("id")
ON DELETE set null ON UPDATE cascade;

CREATE TABLE IF NOT EXISTS "config_financeiro_empresa" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"competenciadataref" varchar(20) DEFAULT 'emissao' NOT NULL,
	"percentualtoleranciaorcamentocc" numeric(5, 2) DEFAULT 0,
	"bloqueardespesaacimaorcamento" boolean DEFAULT false,
	"currenttimemillis" integer,
	"dataultimaalteracao" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "config_financeiro_empresa_idempresa_key"
	ON "config_financeiro_empresa" ("idempresa");

ALTER TABLE "config_financeiro_empresa"
ADD CONSTRAINT "config_financeiro_empresa_idempresa_fkey"
FOREIGN KEY ("idempresa") REFERENCES "public"."empresas"("id")
ON DELETE cascade ON UPDATE cascade;

ALTER TABLE "ordemservico" ADD COLUMN IF NOT EXISTS "idcentrocusto" text;

ALTER TABLE "ordemservico"
ADD CONSTRAINT "fk_ordemservico_centrocusto"
FOREIGN KEY ("idcentrocusto") REFERENCES "public"."centrocusto"("id")
ON DELETE set null ON UPDATE cascade;

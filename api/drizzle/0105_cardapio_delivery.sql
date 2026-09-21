ALTER TABLE "produtos" ADD COLUMN IF NOT EXISTS "exibircardapiodelivery" integer DEFAULT 0;

CREATE TABLE IF NOT EXISTS "cardapiodelivery" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"slug" varchar(80) NOT NULL,
	"ativo" integer DEFAULT 0 NOT NULL,
	"corprimaria" varchar(16) DEFAULT '#c2410c',
	"logourl" varchar(255),
	"bannerurl" varchar(255),
	"habilitadelivery" integer DEFAULT 1 NOT NULL,
	"habilitaretirada" integer DEFAULT 1 NOT NULL,
	"taxaentregapadrao" numeric(12, 2) DEFAULT '0',
	"bairrosentrega" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"pedidominimo" numeric(12, 2) DEFAULT '0',
	"chavepix" varchar(120),
	"tempomedioentrega" varchar(60),
	"mensagemrodape" text,
	"horario" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"camposfinalizacao" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"idmeiospagamento" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"criadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"atualizadoem" timestamp(3) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "cardapiodelivery_idempresa_key" ON "cardapiodelivery" ("idempresa");
CREATE UNIQUE INDEX IF NOT EXISTS "cardapiodelivery_slug_key" ON "cardapiodelivery" ("slug");
CREATE INDEX IF NOT EXISTS "cardapiodelivery_idempresa_idx" ON "cardapiodelivery" ("idempresa");

DO $$ BEGIN
 ALTER TABLE "cardapiodelivery" ADD CONSTRAINT "cardapiodelivery_idempresa_fkey" FOREIGN KEY ("idempresa") REFERENCES "empresas"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "pedidocardapiodelivery" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"idcardapio" text NOT NULL,
	"protocolo" varchar(20) NOT NULL,
	"clientorderid" varchar(80) NOT NULL,
	"status" varchar(20) DEFAULT 'pendente' NOT NULL,
	"modalidade" varchar(20) NOT NULL,
	"nomecliente" varchar(120) NOT NULL,
	"telefone" varchar(20) NOT NULL,
	"documento" varchar(20),
	"endereco" varchar(200),
	"numero" varchar(20),
	"bairro" varchar(80),
	"complemento" varchar(80),
	"referencia" varchar(120),
	"idmeiopagamento" text,
	"nomemeiopagamento" varchar(80),
	"observacao" text,
	"subtotal" numeric(12, 2) NOT NULL,
	"valorentrega" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"itens" jsonb NOT NULL,
	"respostas" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"mensagemerro" text,
	"idcontamensalocal" text,
	"ackingestadoem" timestamp(3),
	"criadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"atualizadoem" timestamp(3) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "pedidocardapiodelivery_protocolo_key" ON "pedidocardapiodelivery" ("protocolo");
CREATE UNIQUE INDEX IF NOT EXISTS "pedidocardapiodelivery_clientorderid_empresa_key" ON "pedidocardapiodelivery" ("idempresa", "clientorderid");
CREATE INDEX IF NOT EXISTS "pedidocardapiodelivery_pendentes_idx" ON "pedidocardapiodelivery" ("idempresa", "status", "criadoem");

DO $$ BEGIN
 ALTER TABLE "pedidocardapiodelivery" ADD CONSTRAINT "pedidocardapiodelivery_idempresa_fkey" FOREIGN KEY ("idempresa") REFERENCES "empresas"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "pedidocardapiodelivery" ADD CONSTRAINT "pedidocardapiodelivery_idcardapio_fkey" FOREIGN KEY ("idcardapio") REFERENCES "cardapiodelivery"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

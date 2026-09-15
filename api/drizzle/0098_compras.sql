CREATE TABLE IF NOT EXISTS "cotacaocompra" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"codigo" integer NOT NULL,
	"titulo" varchar(120) NOT NULL,
	"observacao" text,
	"status" char(1) NOT NULL,
	"tokenpublico" text,
	"validade" date,
	"currenttimemillis" bigint
);

CREATE INDEX IF NOT EXISTS "cotacaocompra_idempresa_idx" ON "cotacaocompra" ("idempresa");
CREATE UNIQUE INDEX IF NOT EXISTS "cotacaocompra_tokenpublico_uidx"
	ON "cotacaocompra" ("tokenpublico")
	WHERE "tokenpublico" IS NOT NULL;

ALTER TABLE "cotacaocompra"
ADD CONSTRAINT "cotacaocompra_idempresa_fkey"
FOREIGN KEY ("idempresa") REFERENCES "public"."empresas"("id")
ON DELETE cascade ON UPDATE cascade;

CREATE TABLE IF NOT EXISTS "cotacaocompraitem" (
	"id" text PRIMARY KEY NOT NULL,
	"idcotacao" text NOT NULL,
	"idproduto" text NOT NULL,
	"quantidade" numeric(18, 6) NOT NULL,
	"unidademedida" varchar(6),
	"observacao" text,
	"ordem" smallint DEFAULT 0 NOT NULL
);

CREATE INDEX IF NOT EXISTS "cotacaocompraitem_cotacao_idx" ON "cotacaocompraitem" ("idcotacao");
CREATE UNIQUE INDEX IF NOT EXISTS "cotacaocompraitem_cotacao_produto_uidx"
	ON "cotacaocompraitem" ("idcotacao", "idproduto");

ALTER TABLE "cotacaocompraitem"
ADD CONSTRAINT "cotacaocompraitem_idcotacao_fkey"
FOREIGN KEY ("idcotacao") REFERENCES "public"."cotacaocompra"("id")
ON DELETE cascade ON UPDATE cascade;

ALTER TABLE "cotacaocompraitem"
ADD CONSTRAINT "cotacaocompraitem_idproduto_fkey"
FOREIGN KEY ("idproduto") REFERENCES "public"."produtos"("id")
ON DELETE restrict ON UPDATE cascade;

CREATE TABLE IF NOT EXISTS "cotacaocompraproposta" (
	"id" text PRIMARY KEY NOT NULL,
	"idcotacao" text NOT NULL,
	"nome" varchar(120) NOT NULL,
	"telefone" varchar(20) NOT NULL,
	"currenttimemillis" bigint
);

CREATE INDEX IF NOT EXISTS "cotacaocompraproposta_cotacao_idx" ON "cotacaocompraproposta" ("idcotacao");
CREATE UNIQUE INDEX IF NOT EXISTS "cotacaocompraproposta_cotacao_telefone_uidx"
	ON "cotacaocompraproposta" ("idcotacao", "telefone");

ALTER TABLE "cotacaocompraproposta"
ADD CONSTRAINT "cotacaocompraproposta_idcotacao_fkey"
FOREIGN KEY ("idcotacao") REFERENCES "public"."cotacaocompra"("id")
ON DELETE cascade ON UPDATE cascade;

CREATE TABLE IF NOT EXISTS "cotacaocomprapropostaitem" (
	"id" text PRIMARY KEY NOT NULL,
	"idproposta" text NOT NULL,
	"idcotacaoitem" text NOT NULL,
	"precounitario" numeric(12, 2) NOT NULL
);

CREATE INDEX IF NOT EXISTS "cotacaocomprapropostaitem_proposta_idx" ON "cotacaocomprapropostaitem" ("idproposta");
CREATE UNIQUE INDEX IF NOT EXISTS "cotacaocomprapropostaitem_proposta_item_uidx"
	ON "cotacaocomprapropostaitem" ("idproposta", "idcotacaoitem");

ALTER TABLE "cotacaocomprapropostaitem"
ADD CONSTRAINT "cotacaocomprapropostaitem_idproposta_fkey"
FOREIGN KEY ("idproposta") REFERENCES "public"."cotacaocompraproposta"("id")
ON DELETE cascade ON UPDATE cascade;

ALTER TABLE "cotacaocomprapropostaitem"
ADD CONSTRAINT "cotacaocomprapropostaitem_idcotacaoitem_fkey"
FOREIGN KEY ("idcotacaoitem") REFERENCES "public"."cotacaocompraitem"("id")
ON DELETE cascade ON UPDATE cascade;

CREATE TABLE IF NOT EXISTS "pedidocompra" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"codigo" integer NOT NULL,
	"idcotacao" text,
	"idproposta" text,
	"fornecedornome" varchar(120) NOT NULL,
	"fornecedortelefone" varchar(20) NOT NULL,
	"valortotal" numeric(12, 2) NOT NULL,
	"status" char(1) NOT NULL,
	"observacao" text,
	"currenttimemillis" bigint
);

CREATE INDEX IF NOT EXISTS "pedidocompra_idempresa_idx" ON "pedidocompra" ("idempresa");

ALTER TABLE "pedidocompra"
ADD CONSTRAINT "pedidocompra_idempresa_fkey"
FOREIGN KEY ("idempresa") REFERENCES "public"."empresas"("id")
ON DELETE cascade ON UPDATE cascade;

ALTER TABLE "pedidocompra"
ADD CONSTRAINT "pedidocompra_idcotacao_fkey"
FOREIGN KEY ("idcotacao") REFERENCES "public"."cotacaocompra"("id")
ON DELETE restrict ON UPDATE cascade;

ALTER TABLE "pedidocompra"
ADD CONSTRAINT "pedidocompra_idproposta_fkey"
FOREIGN KEY ("idproposta") REFERENCES "public"."cotacaocompraproposta"("id")
ON DELETE restrict ON UPDATE cascade;

CREATE TABLE IF NOT EXISTS "pedidocompraitem" (
	"id" text PRIMARY KEY NOT NULL,
	"idpedidocompra" text NOT NULL,
	"idproduto" text NOT NULL,
	"quantidade" numeric(18, 6) NOT NULL,
	"precounitario" numeric(12, 2) NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"idcotacaoitem" text
);

CREATE INDEX IF NOT EXISTS "pedidocompraitem_pedido_idx" ON "pedidocompraitem" ("idpedidocompra");

ALTER TABLE "pedidocompraitem"
ADD CONSTRAINT "pedidocompraitem_idpedidocompra_fkey"
FOREIGN KEY ("idpedidocompra") REFERENCES "public"."pedidocompra"("id")
ON DELETE cascade ON UPDATE cascade;

ALTER TABLE "pedidocompraitem"
ADD CONSTRAINT "pedidocompraitem_idproduto_fkey"
FOREIGN KEY ("idproduto") REFERENCES "public"."produtos"("id")
ON DELETE restrict ON UPDATE cascade;

ALTER TABLE "pedidocompraitem"
ADD CONSTRAINT "pedidocompraitem_idcotacaoitem_fkey"
FOREIGN KEY ("idcotacaoitem") REFERENCES "public"."cotacaocompraitem"("id")
ON DELETE set null ON UPDATE cascade;

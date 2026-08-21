CREATE TABLE IF NOT EXISTS "fichaproducao" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"idprodutoacabado" text NOT NULL,
	"ativo" smallint DEFAULT 1 NOT NULL,
	"permiteproducaomassa" smallint DEFAULT 0 NOT NULL,
	"producaonavenda" smallint DEFAULT 0 NOT NULL,
	"observacao" text,
	"currenttimemillis" bigint,
	"criadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"atualizadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS "fichaproducao_idempresa_idx" ON "fichaproducao" ("idempresa");
CREATE INDEX IF NOT EXISTS "fichaproducao_produto_idx" ON "fichaproducao" ("idprodutoacabado");
CREATE UNIQUE INDEX IF NOT EXISTS "fichaproducao_empresa_produto_ativo_uidx"
	ON "fichaproducao" ("idempresa", "idprodutoacabado")
	WHERE "ativo" = 1;

ALTER TABLE "fichaproducao"
ADD CONSTRAINT "fichaproducao_idempresa_fkey"
FOREIGN KEY ("idempresa") REFERENCES "public"."empresas"("id")
ON DELETE cascade ON UPDATE cascade;

ALTER TABLE "fichaproducao"
ADD CONSTRAINT "fichaproducao_idprodutoacabado_fkey"
FOREIGN KEY ("idprodutoacabado") REFERENCES "public"."produtos"("id")
ON DELETE restrict ON UPDATE cascade;

CREATE TABLE IF NOT EXISTS "fichaproducaoitem" (
	"id" text PRIMARY KEY NOT NULL,
	"idfichaproducao" text NOT NULL,
	"idproduto" text NOT NULL,
	"quantidade" numeric(18, 6) NOT NULL,
	"ordem" smallint DEFAULT 0 NOT NULL
);

CREATE INDEX IF NOT EXISTS "fichaproducaoitem_ficha_idx" ON "fichaproducaoitem" ("idfichaproducao");
CREATE INDEX IF NOT EXISTS "fichaproducaoitem_produto_idx" ON "fichaproducaoitem" ("idproduto");
CREATE UNIQUE INDEX IF NOT EXISTS "fichaproducaoitem_ficha_produto_uidx"
	ON "fichaproducaoitem" ("idfichaproducao", "idproduto");

ALTER TABLE "fichaproducaoitem"
ADD CONSTRAINT "fichaproducaoitem_idfichaproducao_fkey"
FOREIGN KEY ("idfichaproducao") REFERENCES "public"."fichaproducao"("id")
ON DELETE cascade ON UPDATE cascade;

ALTER TABLE "fichaproducaoitem"
ADD CONSTRAINT "fichaproducaoitem_idproduto_fkey"
FOREIGN KEY ("idproduto") REFERENCES "public"."produtos"("id")
ON DELETE restrict ON UPDATE cascade;

CREATE TABLE IF NOT EXISTS "registroproducao" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"idfichaproducao" text NOT NULL,
	"idprodutoacabado" text NOT NULL,
	"origem" smallint NOT NULL,
	"quantidadeproduzida" numeric(18, 6) NOT NULL,
	"custototal" numeric(21, 10),
	"custounitario" numeric(21, 10),
	"idoriginal" text,
	"tipoestoque" smallint NOT NULL,
	"idusuario" text,
	"status" smallint DEFAULT 1 NOT NULL,
	"datahora" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"currenttimemillis" bigint
);

CREATE INDEX IF NOT EXISTS "registroproducao_idempresa_idx" ON "registroproducao" ("idempresa");
CREATE INDEX IF NOT EXISTS "registroproducao_ficha_idx" ON "registroproducao" ("idfichaproducao");
CREATE INDEX IF NOT EXISTS "registroproducao_produto_idx" ON "registroproducao" ("idprodutoacabado");
CREATE INDEX IF NOT EXISTS "registroproducao_idoriginal_idx" ON "registroproducao" ("idoriginal");

ALTER TABLE "registroproducao"
ADD CONSTRAINT "registroproducao_idempresa_fkey"
FOREIGN KEY ("idempresa") REFERENCES "public"."empresas"("id")
ON DELETE cascade ON UPDATE cascade;

ALTER TABLE "registroproducao"
ADD CONSTRAINT "registroproducao_idfichaproducao_fkey"
FOREIGN KEY ("idfichaproducao") REFERENCES "public"."fichaproducao"("id")
ON DELETE restrict ON UPDATE cascade;

ALTER TABLE "registroproducao"
ADD CONSTRAINT "registroproducao_idprodutoacabado_fkey"
FOREIGN KEY ("idprodutoacabado") REFERENCES "public"."produtos"("id")
ON DELETE restrict ON UPDATE cascade;

ALTER TABLE "registroproducao"
ADD CONSTRAINT "registroproducao_idusuario_fkey"
FOREIGN KEY ("idusuario") REFERENCES "public"."usuarios"("id")
ON DELETE set null ON UPDATE cascade;

CREATE TABLE IF NOT EXISTS "registroproducaoitem" (
	"id" text PRIMARY KEY NOT NULL,
	"idregistroproducao" text NOT NULL,
	"idproduto" text NOT NULL,
	"tipo" smallint NOT NULL,
	"quantidade" numeric(18, 6) NOT NULL,
	"custounitario" numeric(21, 10),
	"custototal" numeric(21, 10)
);

CREATE INDEX IF NOT EXISTS "registroproducaoitem_registro_idx" ON "registroproducaoitem" ("idregistroproducao");
CREATE INDEX IF NOT EXISTS "registroproducaoitem_produto_idx" ON "registroproducaoitem" ("idproduto");

ALTER TABLE "registroproducaoitem"
ADD CONSTRAINT "registroproducaoitem_idregistroproducao_fkey"
FOREIGN KEY ("idregistroproducao") REFERENCES "public"."registroproducao"("id")
ON DELETE cascade ON UPDATE cascade;

ALTER TABLE "registroproducaoitem"
ADD CONSTRAINT "registroproducaoitem_idproduto_fkey"
FOREIGN KEY ("idproduto") REFERENCES "public"."produtos"("id")
ON DELETE restrict ON UPDATE cascade;

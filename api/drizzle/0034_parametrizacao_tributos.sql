CREATE TABLE IF NOT EXISTS "parametrizacaotributos" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"codigocfopentrada" varchar(10),
	"cstentrada" varchar(3),
	"csosnentrada" varchar(3),
	"ncm" varchar(10),
	"taxaicmsentrada" numeric(12, 4),
	"uf" varchar(2),
	"ignorarprimeirodigitocst" smallint DEFAULT 0,
	"idcfopsaidanfe" text,
	"cstnfe" varchar(3),
	"csosnnfe" varchar(3),
	"taxaicmsnfe" numeric(12, 4),
	"idcfopsaidanfce" text,
	"cstnfce" varchar(7),
	"csosnnfce" varchar(3),
	"taxaicmsnfce" numeric(12, 4),
	"aliquotapis" numeric(12, 4),
	"cstpis" varchar(2),
	"aliquotacofins" numeric(12, 4),
	"cstcofins" varchar(2),
	"cstipi" varchar(2),
	"idenquadramentoipi" text,
	"percentualmva" numeric(12, 4),
	"percentualirrf" numeric(12, 4),
	"inativo" smallint DEFAULT 0
);

ALTER TABLE "parametrizacaotributos"
ADD CONSTRAINT "parametrizacaotributos_idempresa_fkey"
FOREIGN KEY ("idempresa") REFERENCES "public"."empresas"("id")
ON DELETE cascade ON UPDATE cascade;

ALTER TABLE "parametrizacaotributos"
ADD CONSTRAINT "parametrizacaotributos_idcfopsaidanfe_fkey"
FOREIGN KEY ("idcfopsaidanfe") REFERENCES "public"."cfop"("id")
ON DELETE set null ON UPDATE cascade;

ALTER TABLE "parametrizacaotributos"
ADD CONSTRAINT "parametrizacaotributos_idcfopsaidanfce_fkey"
FOREIGN KEY ("idcfopsaidanfce") REFERENCES "public"."cfop"("id")
ON DELETE set null ON UPDATE cascade;

CREATE INDEX IF NOT EXISTS "parametrizacaotributos_idempresa_idx"
ON "parametrizacaotributos" USING btree ("idempresa");

CREATE INDEX IF NOT EXISTS "parametrizacaotributos_entrada_idx"
ON "parametrizacaotributos" USING btree ("idempresa", "codigocfopentrada");

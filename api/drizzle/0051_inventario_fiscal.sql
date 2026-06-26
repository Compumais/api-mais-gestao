CREATE TABLE IF NOT EXISTS "inventariofiscal" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"databaixa" date NOT NULL,
	"idproduto" text,
	"codigoproduto" varchar(20) NOT NULL,
	"quantidade" numeric(18, 6) NOT NULL,
	"valorunitario" numeric(15, 6) NOT NULL,
	"valortotal" numeric(15, 2) NOT NULL,
	"codigoposse" varchar(1) DEFAULT '1' NOT NULL,
	"cnpjpossuidor" varchar(18),
	"inscricaoestadualpossuidor" varchar(20),
	"ufpossuidor" varchar(2),
	"criadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"atualizadoem" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventariofiscal_idempresa_databaixa_idx" ON "inventariofiscal" ("idempresa", "databaixa");
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventariofiscal" ADD CONSTRAINT "inventariofiscal_idempresa_fkey" FOREIGN KEY ("idempresa") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventariofiscal" ADD CONSTRAINT "inventariofiscal_idproduto_fkey" FOREIGN KEY ("idproduto") REFERENCES "public"."produtos"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

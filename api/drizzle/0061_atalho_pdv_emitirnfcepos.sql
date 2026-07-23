ALTER TABLE "nfceconfiguracao"
ADD COLUMN IF NOT EXISTS "emitirnfcepos" boolean DEFAULT true NOT NULL;

CREATE TABLE IF NOT EXISTS "atalhopdv" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"idusuario" text NOT NULL,
	"idproduto" text NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	"criadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

DO $$ BEGIN
 ALTER TABLE "atalhopdv" ADD CONSTRAINT "atalhopdv_idempresa_fkey" FOREIGN KEY ("idempresa") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "atalhopdv" ADD CONSTRAINT "atalhopdv_idusuario_fkey" FOREIGN KEY ("idusuario") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "atalhopdv" ADD CONSTRAINT "atalhopdv_idproduto_fkey" FOREIGN KEY ("idproduto") REFERENCES "public"."produtos"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "atalhopdv_idempresa_idusuario_idx" ON "atalhopdv" USING btree ("idempresa","idusuario");
CREATE UNIQUE INDEX IF NOT EXISTS "atalhopdv_empresa_usuario_produto_key" ON "atalhopdv" USING btree ("idempresa","idusuario","idproduto");

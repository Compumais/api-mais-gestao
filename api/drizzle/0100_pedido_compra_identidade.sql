ALTER TABLE "pedidocompra" ADD COLUMN IF NOT EXISTS "identidade" text;

ALTER TABLE "pedidocompra"
ADD CONSTRAINT "pedidocompra_identidade_fkey"
FOREIGN KEY ("identidade") REFERENCES "public"."entidade"("id")
ON DELETE restrict ON UPDATE cascade;

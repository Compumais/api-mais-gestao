ALTER TABLE "vendapdvgourmet" ADD COLUMN IF NOT EXISTS "identidade" text;
ALTER TABLE "vendapdvgourmet" ADD COLUMN IF NOT EXISTS "idcondicaopagto" text;

DO $$ BEGIN
 ALTER TABLE "vendapdvgourmet" ADD CONSTRAINT "vendapdvgourmet_identidade_fkey" FOREIGN KEY ("identidade") REFERENCES "public"."entidade"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "vendapdvgourmet" ADD CONSTRAINT "vendapdvgourmet_idcondicaopagto_fkey" FOREIGN KEY ("idcondicaopagto") REFERENCES "public"."condicaopagamento"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "pedidocompra" ADD COLUMN IF NOT EXISTS "identidade" text;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'pedidocompra_identidade_fkey'
	) THEN
		ALTER TABLE "pedidocompra"
		ADD CONSTRAINT "pedidocompra_identidade_fkey"
		FOREIGN KEY ("identidade") REFERENCES "public"."entidade"("id")
		ON DELETE restrict ON UPDATE cascade;
	END IF;
END $$;

ALTER TABLE "produtos" ADD COLUMN IF NOT EXISTS "idprodutopai" text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "produtos_idempresa_idprodutopai_idx" ON "produtos" ("idempresa", "idprodutopai");
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "produtos"
		ADD CONSTRAINT "produtos_idprodutopai_fkey"
		FOREIGN KEY ("idprodutopai") REFERENCES "produtos"("id")
		ON UPDATE CASCADE ON DELETE RESTRICT;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;

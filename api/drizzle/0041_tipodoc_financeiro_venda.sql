ALTER TABLE "tipodocumentofinanceiro" ADD COLUMN IF NOT EXISTS "idplanocontas" text;
--> statement-breakpoint
ALTER TABLE "tipodocumentofinanceiro" ADD COLUMN IF NOT EXISTS "aprazo" smallint DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "tipodocumentofinanceiro" ADD COLUMN IF NOT EXISTS "prazodias" smallint;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'tipodocumentofinanceiro_idplanocontas_fkey'
	) THEN
		ALTER TABLE "tipodocumentofinanceiro" ADD CONSTRAINT "tipodocumentofinanceiro_idplanocontas_fkey" FOREIGN KEY ("idplanocontas") REFERENCES "public"."planocontas"("id") ON DELETE set null ON UPDATE cascade;
	END IF;
END $$;

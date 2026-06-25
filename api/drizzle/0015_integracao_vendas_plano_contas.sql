DO $$ BEGIN
	IF to_regclass('public.vendapdvgourmet') IS NOT NULL THEN
		ALTER TABLE "vendapdvgourmet" ADD COLUMN IF NOT EXISTS "valorcartaocredito" numeric(12, 3);
		ALTER TABLE "vendapdvgourmet" ADD COLUMN IF NOT EXISTS "valorcartaodebito" numeric(12, 3);
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF to_regclass('public.contamesa') IS NOT NULL THEN
		ALTER TABLE "contamesa" ADD COLUMN IF NOT EXISTS "valorcartaocredito" numeric(12, 3);
		ALTER TABLE "contamesa" ADD COLUMN IF NOT EXISTS "valorcartaodebito" numeric(12, 3);
	END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "financeiro" ADD COLUMN IF NOT EXISTS "idplanocontas" text;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'financeiro_idplanocontas_fkey'
	) THEN
		ALTER TABLE "financeiro" ADD CONSTRAINT "financeiro_idplanocontas_fkey" FOREIGN KEY ("idplanocontas") REFERENCES "public"."planocontas"("id") ON DELETE set null ON UPDATE cascade;
	END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "empresas" ADD COLUMN IF NOT EXISTS "prazocartaocredito" integer DEFAULT 30 NOT NULL;
--> statement-breakpoint
ALTER TABLE "empresas" ADD COLUMN IF NOT EXISTS "prazocartaodebito" integer DEFAULT 1 NOT NULL;

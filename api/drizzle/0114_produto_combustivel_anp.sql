ALTER TABLE "produtos" ADD COLUMN IF NOT EXISTS "codigoanp" varchar(9);
--> statement-breakpoint
ALTER TABLE "produtos" ADD COLUMN IF NOT EXISTS "descricaoanp" varchar(95);
--> statement-breakpoint
ALTER TABLE "produtos" ADD COLUMN IF NOT EXISTS "percentualbiodiesel" numeric(7, 4);

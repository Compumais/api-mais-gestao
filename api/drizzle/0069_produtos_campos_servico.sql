ALTER TABLE "produtos" ADD COLUMN IF NOT EXISTS "itemrapido" integer DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "produtos" ADD COLUMN IF NOT EXISTS "decimaispreco" smallint DEFAULT 2;
--> statement-breakpoint
ALTER TABLE "produtos" ADD COLUMN IF NOT EXISTS "codigolistalc11603" varchar(5);
--> statement-breakpoint
ALTER TABLE "produtos" ADD COLUMN IF NOT EXISTS "codigotributacaonacional" varchar(6);
--> statement-breakpoint
ALTER TABLE "produtos" ADD COLUMN IF NOT EXISTS "codigonbs" varchar(9);
--> statement-breakpoint
ALTER TABLE "produtos" ADD COLUMN IF NOT EXISTS "cicloposvenda" integer DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "produtos" ADD COLUMN IF NOT EXISTS "percentualcomissaoquitacao" numeric(12, 2);
--> statement-breakpoint
ALTER TABLE "produtos" ADD COLUMN IF NOT EXISTS "situacaoiss" varchar(7);
--> statement-breakpoint
ALTER TABLE "produtos" ADD COLUMN IF NOT EXISTS "aliquotaiss" numeric(7, 4);
--> statement-breakpoint
ALTER TABLE "produtos" ADD COLUMN IF NOT EXISTS "exigibilidadeiss" varchar(1);
--> statement-breakpoint
ALTER TABLE "produtos" ADD COLUMN IF NOT EXISTS "processoisencaoiss" varchar(60);
--> statement-breakpoint
ALTER TABLE "produtos" ADD COLUMN IF NOT EXISTS "incentivofiscal" integer DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "produtos" ADD COLUMN IF NOT EXISTS "codigomunicipalservico" varchar(20);
--> statement-breakpoint
ALTER TABLE "produtos" ADD COLUMN IF NOT EXISTS "tipoimpressaogourmet" varchar(40);

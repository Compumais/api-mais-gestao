ALTER TABLE "empresas" ADD COLUMN IF NOT EXISTS "numero" varchar(20) DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "empresas" ADD COLUMN IF NOT EXISTS "complemento" varchar(60) DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "empresas" ADD COLUMN IF NOT EXISTS "bairro" varchar(60) DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "empresas" ADD COLUMN IF NOT EXISTS "cep" varchar(9) DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "empresas" ADD COLUMN IF NOT EXISTS "idestado" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "empresas" ADD COLUMN IF NOT EXISTS "idcidade" text DEFAULT '' NOT NULL;

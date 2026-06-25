ALTER TABLE "notafiscalitem" ADD COLUMN IF NOT EXISTS "quantidade" numeric(15, 6);--> statement-breakpoint
ALTER TABLE "notafiscalitem" ADD COLUMN IF NOT EXISTS "precounitario" numeric(15, 6);--> statement-breakpoint
ALTER TABLE "notafiscalitem" ADD COLUMN IF NOT EXISTS "total" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "notafiscalitem" ADD COLUMN IF NOT EXISTS "desconto" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "notafiscalitem" ADD COLUMN IF NOT EXISTS "baseicms" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "notafiscalitem" ADD COLUMN IF NOT EXISTS "percentualicms" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "notafiscalitem" ADD COLUMN IF NOT EXISTS "icms" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "notafiscalitem" ADD COLUMN IF NOT EXISTS "aliquotapis" numeric(12, 4);--> statement-breakpoint
ALTER TABLE "notafiscalitem" ADD COLUMN IF NOT EXISTS "pis" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "notafiscalitem" ADD COLUMN IF NOT EXISTS "cofins" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "notafiscalitem" ADD COLUMN IF NOT EXISTS "ipi" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "notafiscalitem" ADD COLUMN IF NOT EXISTS "custoaquisicao" numeric(15, 6);--> statement-breakpoint
ALTER TABLE "notafiscalitem" ADD COLUMN IF NOT EXISTS "frete" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "notafiscalitem" ADD COLUMN IF NOT EXISTS "seguro" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "notafiscalitem" ADD COLUMN IF NOT EXISTS "outrasdespesas" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "notafiscalitem" ADD COLUMN IF NOT EXISTS "pisretido" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "notafiscalitem" ADD COLUMN IF NOT EXISTS "cofinsretido" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "notafiscalitem" ADD COLUMN IF NOT EXISTS "inss" numeric(12, 2);

DROP INDEX "idx_fin_entid_tipo_status";--> statement-breakpoint
DROP INDEX "idx_financeiro_sped";--> statement-breakpoint
ALTER TABLE "contacorrente" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "contacorrentelancamento" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "contacorrentelancamento" ALTER COLUMN "idcontacorrente" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "financeiro" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "financeirolancamento" ALTER COLUMN "idfinanceiro" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "financeirolancamento" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "planocontas" ADD PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "planocontas" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "usuarios" ALTER COLUMN "maxCompanies" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "usuarios" ALTER COLUMN "maxCompanies" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "contacorrente" ADD COLUMN "empresaId" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "financeiro" ADD COLUMN "empresaId" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "planocontas" ADD COLUMN "empresaId" uuid NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_fin_entid_tipo_status" ON "financeiro" USING btree ("identidade" int8_ops,"tipo" bpchar_ops,"status" bpchar_ops);--> statement-breakpoint
CREATE INDEX "idx_financeiro_sped" ON "financeiro" USING btree ("idorigem" int8_ops,"tipoorigem" int2_ops);
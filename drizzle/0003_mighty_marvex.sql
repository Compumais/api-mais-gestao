ALTER TABLE "audit_logs" ADD COLUMN "empresaId" text;--> statement-breakpoint
ALTER TABLE "planocontas" ADD COLUMN "planoContasId" text;--> statement-breakpoint
ALTER TABLE "planocontas" ADD CONSTRAINT "planocontas_planocontasid_fkey" FOREIGN KEY ("planoContasId") REFERENCES "public"."planocontas"("id") ON DELETE restrict ON UPDATE cascade;
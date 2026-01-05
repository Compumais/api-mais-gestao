ALTER TABLE "contacorrente" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "contacorrente" ALTER COLUMN "empresaId" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "contacorrentelancamento" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "contacorrentelancamento" ALTER COLUMN "idcontacorrente" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "financeiro" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "financeiro" ALTER COLUMN "empresaId" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "financeirolancamento" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "financeirolancamento" ALTER COLUMN "idfinanceiro" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "planocontas" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "planocontas" ALTER COLUMN "empresaId" SET DATA TYPE text;
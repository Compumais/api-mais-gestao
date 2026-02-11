CREATE TABLE "configuracoes" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"notificacoes" jsonb DEFAULT '{}'::jsonb,
	"integracao" jsonb DEFAULT '{}'::jsonb,
	"relatorios" jsonb DEFAULT '{}'::jsonb,
	"impressao" jsonb DEFAULT '{}'::jsonb,
	"criadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"atualizadoem" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contacorrentelancamento" ALTER COLUMN "idplanocontas" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "configuracoes" ADD CONSTRAINT "configuracoes_idempresa_fkey" FOREIGN KEY ("idempresa") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "configuracoes_idempresa_key" ON "configuracoes" USING btree ("idempresa");
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "ativo" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "usuarios_ativo_idx" ON "usuarios" ("ativo");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "informativos" (
	"id" text PRIMARY KEY NOT NULL,
	"titulo" text NOT NULL,
	"conteudo" text NOT NULL,
	"publicado" boolean DEFAULT true NOT NULL,
	"publicadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"criadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"atualizadoem" timestamp(3) NOT NULL
);

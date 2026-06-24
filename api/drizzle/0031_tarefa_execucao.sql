CREATE TABLE IF NOT EXISTS "tarefa_execucao" (
	"id" text PRIMARY KEY NOT NULL,
	"tipo" varchar(50) NOT NULL,
	"idempresa" text,
	"status" varchar(20) NOT NULL,
	"iniciadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"finalizadoem" timestamp(3),
	"detalhes" jsonb,
	"erro" text
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tarefa_execucao_tipo_idx" ON "tarefa_execucao" ("tipo");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tarefa_execucao_idempresa_idx" ON "tarefa_execucao" ("idempresa");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tarefa_execucao_iniciadoem_idx" ON "tarefa_execucao" ("iniciadoem");
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tarefa_execucao" ADD CONSTRAINT "tarefa_execucao_idempresa_fkey" FOREIGN KEY ("idempresa") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

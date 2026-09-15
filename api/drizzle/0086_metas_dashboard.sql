CREATE TABLE IF NOT EXISTS "metas_dashboard" (
	"id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
	"idempresa" text NOT NULL,
	"tipo" text NOT NULL,
	"periodo_inicio" date NOT NULL,
	"periodo_fim" date NOT NULL,
	"valor_meta" numeric(18, 4) NOT NULL,
	"criadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"atualizadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS "metas_dashboard_idempresa_idx"
	ON "metas_dashboard" ("idempresa");

CREATE INDEX IF NOT EXISTS "metas_dashboard_empresa_periodo_idx"
	ON "metas_dashboard" ("idempresa", "periodo_inicio", "periodo_fim");

ALTER TABLE "metas_dashboard"
ADD CONSTRAINT "metas_dashboard_idempresa_fkey"
FOREIGN KEY ("idempresa") REFERENCES "public"."empresas"("id")
ON DELETE cascade ON UPDATE cascade;

ALTER TABLE "metas_dashboard"
ADD CONSTRAINT "metas_dashboard_tipo_check"
CHECK ("tipo" IN ('faturamento', 'vendas', 'lucro', 'margem', 'despesas'));

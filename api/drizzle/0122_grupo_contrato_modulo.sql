CREATE TABLE IF NOT EXISTS "grupocontrato" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"codigo" integer NOT NULL,
	"descricao" varchar(120) NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "grupocontrato" ADD CONSTRAINT "fk_grupocontrato_empresa" FOREIGN KEY ("idempresa") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "tipocontrato" ADD COLUMN IF NOT EXISTS "idgrupocontrato" text;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tipocontrato" ADD CONSTRAINT "fk_tipocontrato_grupocontrato" FOREIGN KEY ("idgrupocontrato") REFERENCES "public"."grupocontrato"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
INSERT INTO "modulos_saas" ("id", "codigo", "nome", "descricao", "valormensal") VALUES
	('mod-contratos', 'contratos', 'Gestão de contratos', 'Cadastro, faturamento e cobrança de contratos recorrentes', '49.00')
ON CONFLICT DO NOTHING;

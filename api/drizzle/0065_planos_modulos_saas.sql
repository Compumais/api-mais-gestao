ALTER TABLE "assinaturas" ADD COLUMN IF NOT EXISTS "idusuario" text;
ALTER TABLE "assinaturas" ADD COLUMN IF NOT EXISTS "origem" text DEFAULT 'ASAAS';

CREATE TABLE IF NOT EXISTS "planos_saas" (
	"id" text PRIMARY KEY NOT NULL,
	"codigo" text NOT NULL,
	"nome" text NOT NULL,
	"descricao" text,
	"valormensal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"maxempresas" integer DEFAULT 1 NOT NULL,
	"maxusuarios" integer DEFAULT 3 NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"criadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"atualizadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "planos_saas_codigo_key" ON "planos_saas" USING btree ("codigo");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "features_saas" (
	"id" text PRIMARY KEY NOT NULL,
	"codigo" text NOT NULL,
	"nome" text NOT NULL,
	"descricao" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"criadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"atualizadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "features_saas_codigo_key" ON "features_saas" USING btree ("codigo");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "plano_saas_features" (
	"idplano" text NOT NULL,
	"idfeature" text NOT NULL,
	"criadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "plano_saas_features_pkey" PRIMARY KEY("idplano","idfeature")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "modulos_saas" (
	"id" text PRIMARY KEY NOT NULL,
	"codigo" text NOT NULL,
	"nome" text NOT NULL,
	"descricao" text,
	"valormensal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"criadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"atualizadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "modulos_saas_codigo_key" ON "modulos_saas" USING btree ("codigo");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "usuario_modulos" (
	"id" text PRIMARY KEY NOT NULL,
	"idusuario" text NOT NULL,
	"idmodulo" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"origem" text DEFAULT 'ASAAS' NOT NULL,
	"idassinaturaasaas" text,
	"valor" numeric(12, 2),
	"proximovencimento" date,
	"criadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"atualizadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "usuario_modulos_usuario_modulo_key" ON "usuario_modulos" USING btree ("idusuario","idmodulo");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "usuario_modulos_idusuario_idx" ON "usuario_modulos" USING btree ("idusuario");
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plano_saas_features" ADD CONSTRAINT "plano_saas_features_idplano_fkey" FOREIGN KEY ("idplano") REFERENCES "public"."planos_saas"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plano_saas_features" ADD CONSTRAINT "plano_saas_features_idfeature_fkey" FOREIGN KEY ("idfeature") REFERENCES "public"."features_saas"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "usuario_modulos" ADD CONSTRAINT "usuario_modulos_idusuario_fkey" FOREIGN KEY ("idusuario") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "usuario_modulos" ADD CONSTRAINT "usuario_modulos_idmodulo_fkey" FOREIGN KEY ("idmodulo") REFERENCES "public"."modulos_saas"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assinaturas" ADD CONSTRAINT "assinaturas_idusuario_fkey" FOREIGN KEY ("idusuario") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Seed features
INSERT INTO "features_saas" ("id", "codigo", "nome", "descricao") VALUES
	('feat-contas', 'contas_pagar_receber', 'Gestão de contas a pagar e receber', 'Contas a pagar e receber'),
	('feat-suporte', 'suporte_email', 'Suporte por e-mail', 'Suporte por e-mail'),
	('feat-dash-simp', 'dashboard_simplificado', 'Dashboard simplificado', 'Dashboard básico'),
	('feat-os', 'ordem_servico', 'Ordem de serviço', 'Módulo de ordens de serviço'),
	('feat-rel-adv', 'relatorios_avancados', 'Relatórios avançados e personalizados', 'Relatórios avançados'),
	('feat-dash-comp', 'dashboard_completo', 'Dashboard completo com analytics', 'Dashboard completo'),
	('feat-api', 'api_integracoes', 'API para integrações', 'API de integrações'),
	('feat-nfe', 'notas_fiscais', 'Notas fiscais', 'Emissão de NF-e e NFC-e'),
	('feat-multi', 'gestao_multi_empresa', 'Gestão centralizada de múltiplas empresas', 'Multi-empresa'),
	('feat-consol', 'consolidacao_relatorios', 'Consolidação de relatórios', 'Consolidação de relatórios')
ON CONFLICT DO NOTHING;

-- Seed planos
INSERT INTO "planos_saas" ("id", "codigo", "nome", "descricao", "valormensal", "maxempresas", "maxusuarios", "ordem") VALUES
	('plano-basic', 'BASIC', 'Básico', 'Ideal para pequenas empresas que estão começando', '99.00', 1, 3, 1),
	('plano-premium', 'PREMIUM', 'Premium', 'Para empresas em crescimento que precisam de mais recursos', '199.00', 2, 6, 2),
	('plano-enterprise', 'ENTERPRISE', 'Multi-empresa', 'Solução completa para grupos empresariais', '399.00', 5, 12, 3)
ON CONFLICT DO NOTHING;

-- Seed vínculos BASIC
INSERT INTO "plano_saas_features" ("idplano", "idfeature") VALUES
	('plano-basic', 'feat-contas'),
	('plano-basic', 'feat-suporte'),
	('plano-basic', 'feat-dash-simp'),
	('plano-basic', 'feat-os')
ON CONFLICT DO NOTHING;

-- Seed vínculos PREMIUM
INSERT INTO "plano_saas_features" ("idplano", "idfeature") VALUES
	('plano-premium', 'feat-contas'),
	('plano-premium', 'feat-suporte'),
	('plano-premium', 'feat-dash-simp'),
	('plano-premium', 'feat-os'),
	('plano-premium', 'feat-rel-adv'),
	('plano-premium', 'feat-dash-comp'),
	('plano-premium', 'feat-api'),
	('plano-premium', 'feat-nfe')
ON CONFLICT DO NOTHING;

-- Seed vínculos ENTERPRISE
INSERT INTO "plano_saas_features" ("idplano", "idfeature") VALUES
	('plano-enterprise', 'feat-contas'),
	('plano-enterprise', 'feat-suporte'),
	('plano-enterprise', 'feat-dash-simp'),
	('plano-enterprise', 'feat-os'),
	('plano-enterprise', 'feat-rel-adv'),
	('plano-enterprise', 'feat-dash-comp'),
	('plano-enterprise', 'feat-api'),
	('plano-enterprise', 'feat-nfe'),
	('plano-enterprise', 'feat-multi'),
	('plano-enterprise', 'feat-consol')
ON CONFLICT DO NOTHING;

-- Seed módulos
INSERT INTO "modulos_saas" ("id", "codigo", "nome", "descricao", "valormensal") VALUES
	('mod-gourmet', 'gourmet', 'Gourmet', 'Gestão de mesas e garçom', '79.00'),
	('mod-nfse', 'nfse', 'Nota fiscal de serviço', 'Emissão de NFS-e', '59.00'),
	('mod-ia', 'ia_financeira', 'Inteligência Artificial financeira', 'Insights financeiros com IA', '99.00')
ON CONFLICT DO NOTHING;

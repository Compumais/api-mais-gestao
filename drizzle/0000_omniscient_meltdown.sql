CREATE TABLE "contas" (
	"id" text PRIMARY KEY NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp(3),
	"refreshTokenExpiresAt" timestamp(3),
	"scope" text,
	"password" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clientes" (
	"id" text PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"email" text,
	"telefone" text,
	"endereco" text,
	"cidade" text,
	"estado" text,
	"cep" text,
	"pais" text,
	"empresaId" text NOT NULL,
	"criadoEm" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"atualizadoEm" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "empresas" (
	"id" text PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"cnpj" text NOT NULL,
	"telefone" text NOT NULL,
	"proprietarioId" text NOT NULL,
	"criadoEm" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"atualizadoEm" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessoes" (
	"id" text PRIMARY KEY NOT NULL,
	"expiresAt" timestamp(3) NOT NULL,
	"token" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"image" text,
	"maxCompanies" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuario_empresas" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"empresaId" text NOT NULL,
	"criadoEm" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"atualizadoEm" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verificacoes" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp(3) NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_userId_fkey";
--> statement-breakpoint
ALTER TABLE "contacorrente" ALTER COLUMN "imagemboleto" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "acao" text NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "recurso" text NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "recursoId" text;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "metadados" jsonb;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "criadoEm" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL;--> statement-breakpoint
ALTER TABLE "contas" ADD CONSTRAINT "contas_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "empresas" ADD CONSTRAINT "empresas_proprietarioId_fkey" FOREIGN KEY ("proprietarioId") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "usuario_empresas" ADD CONSTRAINT "usuario_empresas_usuarioId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "usuario_empresas" ADD CONSTRAINT "usuario_empresas_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "public"."empresas"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "clients_companyId_idx" ON "clientes" USING btree ("empresaId" text_ops);--> statement-breakpoint
CREATE INDEX "clients_email_idx" ON "clientes" USING btree ("email" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "empresas_cnpj_key" ON "empresas" USING btree ("cnpj" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "sessoes_token_key" ON "sessoes" USING btree ("token" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios" USING btree ("email" text_ops);--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "audit_logs" DROP COLUMN "action";--> statement-breakpoint
ALTER TABLE "audit_logs" DROP COLUMN "resource";--> statement-breakpoint
ALTER TABLE "audit_logs" DROP COLUMN "resourceId";--> statement-breakpoint
ALTER TABLE "audit_logs" DROP COLUMN "metadata";--> statement-breakpoint
ALTER TABLE "audit_logs" DROP COLUMN "createdAt";
CREATE TABLE IF NOT EXISTS "contrato" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"identidade" text NOT NULL,
	"codigo" varchar(40),
	"descricao" varchar(255) NOT NULL,
	"situacao" varchar(20) DEFAULT 'ativo' NOT NULL,
	"datainicio" date NOT NULL,
	"datafim" date,
	"valor" numeric(12, 2) NOT NULL,
	"periodicidade" varchar(20) DEFAULT 'mensal' NOT NULL,
	"diavencimento" smallint NOT NULL,
	"regracompetencia" varchar(30) DEFAULT 'mes_atual' NOT NULL,
	"fluxofaturamento" smallint NOT NULL,
	"discriminacao" text,
	"itemlistaservico" varchar(20),
	"codigonbs" varchar(9),
	"codigotributacaonacional" varchar(6),
	"idcondicaopagto" text,
	"idtipodocumento" text,
	"idplanocontas" text,
	"idcontacorrente" text,
	"idtipocobranca" text,
	"observacao" text,
	"criadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"atualizadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contrato_faturamento_lote" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"competencia" varchar(7) NOT NULL,
	"status" varchar(30) DEFAULT 'rascunho' NOT NULL,
	"idusuario" text NOT NULL,
	"observacao" text,
	"criadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"atualizadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contrato_cobranca" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"idcontrato" text NOT NULL,
	"idlote" text,
	"competencia" varchar(7) NOT NULL,
	"valor" numeric(12, 2) NOT NULL,
	"vencimento" date NOT NULL,
	"fluxofaturamento" smallint NOT NULL,
	"discriminacao" text,
	"statusfaturamento" varchar(40) DEFAULT 'elegivel' NOT NULL,
	"etapaatual" varchar(60),
	"ultimoerro" text,
	"tentativas" integer DEFAULT 0 NOT NULL,
	"idnotafiscal" text,
	"idfinanceiro" text,
	"idremessaitem" text,
	"criadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"atualizadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "remessa_bancaria" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"idcontacorrente" text NOT NULL,
	"sequencia" integer NOT NULL,
	"layout" varchar(40) DEFAULT 'cnab240' NOT NULL,
	"status" varchar(20) DEFAULT 'aberta' NOT NULL,
	"nomearquivo" varchar(120),
	"conteudo" text,
	"idusuario" text NOT NULL,
	"criadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"atualizadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"enviadaem" timestamp(3)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "remessa_bancaria_item" (
	"id" text PRIMARY KEY NOT NULL,
	"idremessa" text NOT NULL,
	"idfinanceiro" text NOT NULL,
	"idcobranca" text,
	"nossonumero" varchar(25),
	"criadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contrato_idempresa_idx" ON "contrato" USING btree ("idempresa");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contrato_identidade_idx" ON "contrato" USING btree ("identidade");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contrato_situacao_idx" ON "contrato" USING btree ("situacao");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contrato_faturamento_lote_idempresa_idx" ON "contrato_faturamento_lote" USING btree ("idempresa");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contrato_faturamento_lote_competencia_idx" ON "contrato_faturamento_lote" USING btree ("competencia");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "contrato_cobranca_empresa_contrato_competencia_uidx" ON "contrato_cobranca" USING btree ("idempresa","idcontrato","competencia");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contrato_cobranca_idlote_idx" ON "contrato_cobranca" USING btree ("idlote");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contrato_cobranca_status_idx" ON "contrato_cobranca" USING btree ("statusfaturamento");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "remessa_bancaria_idempresa_idx" ON "remessa_bancaria" USING btree ("idempresa");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "remessa_bancaria_conta_status_idx" ON "remessa_bancaria" USING btree ("idcontacorrente","status");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "remessa_bancaria_item_idfinanceiro_uidx" ON "remessa_bancaria_item" USING btree ("idfinanceiro");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "remessa_bancaria_item_idremessa_idx" ON "remessa_bancaria_item" USING btree ("idremessa");
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contrato" ADD CONSTRAINT "contrato_idempresa_fkey" FOREIGN KEY ("idempresa") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contrato" ADD CONSTRAINT "contrato_identidade_fkey" FOREIGN KEY ("identidade") REFERENCES "public"."entidade"("id") ON DELETE restrict ON UPDATE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contrato" ADD CONSTRAINT "contrato_idcondicaopagto_fkey" FOREIGN KEY ("idcondicaopagto") REFERENCES "public"."condicaopagamento"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contrato" ADD CONSTRAINT "contrato_idtipodocumento_fkey" FOREIGN KEY ("idtipodocumento") REFERENCES "public"."tipodocumentofinanceiro"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contrato" ADD CONSTRAINT "contrato_idplanocontas_fkey" FOREIGN KEY ("idplanocontas") REFERENCES "public"."planocontas"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contrato" ADD CONSTRAINT "contrato_idcontacorrente_fkey" FOREIGN KEY ("idcontacorrente") REFERENCES "public"."contacorrente"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contrato" ADD CONSTRAINT "contrato_idtipocobranca_fkey" FOREIGN KEY ("idtipocobranca") REFERENCES "public"."tipocobranca"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contrato_faturamento_lote" ADD CONSTRAINT "contrato_faturamento_lote_idempresa_fkey" FOREIGN KEY ("idempresa") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contrato_faturamento_lote" ADD CONSTRAINT "contrato_faturamento_lote_idusuario_fkey" FOREIGN KEY ("idusuario") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contrato_cobranca" ADD CONSTRAINT "contrato_cobranca_idempresa_fkey" FOREIGN KEY ("idempresa") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contrato_cobranca" ADD CONSTRAINT "contrato_cobranca_idcontrato_fkey" FOREIGN KEY ("idcontrato") REFERENCES "public"."contrato"("id") ON DELETE restrict ON UPDATE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contrato_cobranca" ADD CONSTRAINT "contrato_cobranca_idlote_fkey" FOREIGN KEY ("idlote") REFERENCES "public"."contrato_faturamento_lote"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contrato_cobranca" ADD CONSTRAINT "contrato_cobranca_idnotafiscal_fkey" FOREIGN KEY ("idnotafiscal") REFERENCES "public"."notafiscal"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contrato_cobranca" ADD CONSTRAINT "contrato_cobranca_idfinanceiro_fkey" FOREIGN KEY ("idfinanceiro") REFERENCES "public"."financeiro"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "remessa_bancaria" ADD CONSTRAINT "remessa_bancaria_idempresa_fkey" FOREIGN KEY ("idempresa") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "remessa_bancaria" ADD CONSTRAINT "remessa_bancaria_idcontacorrente_fkey" FOREIGN KEY ("idcontacorrente") REFERENCES "public"."contacorrente"("id") ON DELETE restrict ON UPDATE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "remessa_bancaria" ADD CONSTRAINT "remessa_bancaria_idusuario_fkey" FOREIGN KEY ("idusuario") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "remessa_bancaria_item" ADD CONSTRAINT "remessa_bancaria_item_idremessa_fkey" FOREIGN KEY ("idremessa") REFERENCES "public"."remessa_bancaria"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "remessa_bancaria_item" ADD CONSTRAINT "remessa_bancaria_item_idfinanceiro_fkey" FOREIGN KEY ("idfinanceiro") REFERENCES "public"."financeiro"("id") ON DELETE restrict ON UPDATE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "retorno_bancario" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"idcontacorrente" text NOT NULL,
	"nomearquivo" varchar(180) NOT NULL,
	"checksum" varchar(64) NOT NULL,
	"layout" varchar(40) DEFAULT 'cnab240' NOT NULL,
	"status" varchar(30) DEFAULT 'importado' NOT NULL,
	"idusuario" text NOT NULL,
	"criadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"processadoem" timestamp(3)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "retorno_bancario_item" (
	"id" text PRIMARY KEY NOT NULL,
	"idretorno" text NOT NULL,
	"nossonumero" varchar(40),
	"numerodocumento" varchar(40),
	"nomesacado" varchar(150),
	"valor" numeric(15, 2),
	"valorpago" numeric(15, 2),
	"vencimento" varchar(10),
	"datacredito" varchar(10),
	"dataocorrencia" varchar(10),
	"ocorrencia" varchar(10) NOT NULL,
	"ocorrenciadescricao" varchar(120),
	"motivo" varchar(120),
	"desconto" numeric(15, 2),
	"abatimento" numeric(15, 2),
	"juros" numeric(15, 2),
	"multa" numeric(15, 2),
	"outrosacrescimos" numeric(15, 2),
	"taxacobranca" numeric(15, 2),
	"valoriof" numeric(15, 2),
	"idfinanceiro" text,
	"statusprocessamento" varchar(20) DEFAULT 'pendente' NOT NULL,
	"mensagemerro" text,
	"criadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "retorno_bancario_idempresa_idx" ON "retorno_bancario" USING btree ("idempresa");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "retorno_bancario_conta_idx" ON "retorno_bancario" USING btree ("idcontacorrente");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "retorno_bancario_checksum_empresa_uidx" ON "retorno_bancario" USING btree ("idempresa","checksum");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "retorno_bancario_item_idretorno_idx" ON "retorno_bancario_item" USING btree ("idretorno");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "retorno_bancario_item_nossonumero_idx" ON "retorno_bancario_item" USING btree ("nossonumero");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "retorno_bancario_item_idfinanceiro_idx" ON "retorno_bancario_item" USING btree ("idfinanceiro");
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "retorno_bancario" ADD CONSTRAINT "retorno_bancario_idempresa_fkey" FOREIGN KEY ("idempresa") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "retorno_bancario" ADD CONSTRAINT "retorno_bancario_idcontacorrente_fkey" FOREIGN KEY ("idcontacorrente") REFERENCES "public"."contacorrente"("id") ON DELETE restrict ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "retorno_bancario" ADD CONSTRAINT "retorno_bancario_idusuario_fkey" FOREIGN KEY ("idusuario") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "retorno_bancario_item" ADD CONSTRAINT "retorno_bancario_item_idretorno_fkey" FOREIGN KEY ("idretorno") REFERENCES "public"."retorno_bancario"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "retorno_bancario_item" ADD CONSTRAINT "retorno_bancario_item_idfinanceiro_fkey" FOREIGN KEY ("idfinanceiro") REFERENCES "public"."financeiro"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

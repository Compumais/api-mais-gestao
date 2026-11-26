CREATE TABLE "conciliacao_cielo" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"nomearquivo" varchar(180) NOT NULL,
	"checksum" varchar(64) NOT NULL,
	"estabelecimento" varchar(40),
	"periodoinicio" date,
	"periodofim" date,
	"qtdlancamentos" integer DEFAULT 0 NOT NULL,
	"valorbruto" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"valortaxa" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"valorliquido" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"status" varchar(30) DEFAULT 'importado' NOT NULL,
	"idcontacorrente" text,
	"idusuario" text NOT NULL,
	"criadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"processadoem" timestamp(3)
);
--> statement-breakpoint
CREATE TABLE "conciliacao_cielo_item" (
	"id" text PRIMARY KEY NOT NULL,
	"idconciliacao" text NOT NULL,
	"linhacsv" integer NOT NULL,
	"datapagamento" date,
	"datalancamento" date,
	"dataprevistapagamento" date,
	"datavenda" date,
	"estabelecimento" varchar(40),
	"tipolancamento" varchar(60),
	"formapagamento" varchar(80),
	"bandeira" varchar(40),
	"valorbruto" numeric(15, 2),
	"valortaxa" numeric(15, 2),
	"valorliquido" numeric(15, 2),
	"statuspagamento" varchar(40),
	"descricao" varchar(180),
	"codigoautorizacao" varchar(40),
	"nsu" varchar(40),
	"codigovenda" varchar(60),
	"tid" varchar(60),
	"numerocartao" varchar(40),
	"numeropedido" varchar(60),
	"parcela" integer,
	"totalparcelas" integer,
	"modalidade" varchar(40),
	"idfinanceiro" text,
	"idfinanceirosugerido" text,
	"confiancasugestao" integer DEFAULT 0 NOT NULL,
	"statusprocessamento" varchar(20) DEFAULT 'pendente' NOT NULL,
	"mensagemerro" text,
	"criadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conciliacao_cielo" ADD CONSTRAINT "conciliacao_cielo_idempresa_fkey" FOREIGN KEY ("idempresa") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "conciliacao_cielo" ADD CONSTRAINT "conciliacao_cielo_idcontacorrente_fkey" FOREIGN KEY ("idcontacorrente") REFERENCES "public"."contacorrente"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "conciliacao_cielo" ADD CONSTRAINT "conciliacao_cielo_idusuario_fkey" FOREIGN KEY ("idusuario") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "conciliacao_cielo_item" ADD CONSTRAINT "conciliacao_cielo_item_idconciliacao_fkey" FOREIGN KEY ("idconciliacao") REFERENCES "public"."conciliacao_cielo"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "conciliacao_cielo_item" ADD CONSTRAINT "conciliacao_cielo_item_idfinanceiro_fkey" FOREIGN KEY ("idfinanceiro") REFERENCES "public"."financeiro"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "conciliacao_cielo_item" ADD CONSTRAINT "conciliacao_cielo_item_idfinanceirosugerido_fkey" FOREIGN KEY ("idfinanceirosugerido") REFERENCES "public"."financeiro"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "conciliacao_cielo_idempresa_idx" ON "conciliacao_cielo" USING btree ("idempresa");--> statement-breakpoint
CREATE UNIQUE INDEX "conciliacao_cielo_checksum_empresa_uidx" ON "conciliacao_cielo" USING btree ("idempresa","checksum");--> statement-breakpoint
CREATE INDEX "conciliacao_cielo_item_idconciliacao_idx" ON "conciliacao_cielo_item" USING btree ("idconciliacao");--> statement-breakpoint
CREATE INDEX "conciliacao_cielo_item_nsu_idx" ON "conciliacao_cielo_item" USING btree ("nsu");--> statement-breakpoint
CREATE INDEX "conciliacao_cielo_item_autorizacao_idx" ON "conciliacao_cielo_item" USING btree ("codigoautorizacao");--> statement-breakpoint
CREATE INDEX "conciliacao_cielo_item_idfinanceiro_idx" ON "conciliacao_cielo_item" USING btree ("idfinanceiro");

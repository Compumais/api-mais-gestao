CREATE TABLE "equipamento" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"codigo" varchar(40) NOT NULL,
	"descricao" varchar(120) NOT NULL,
	"numeroserie" varchar(60),
	"situacao" varchar(20) DEFAULT 'disponivel' NOT NULL,
	"precodiaria" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"precosemanal" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"precoquinzenal" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"precomensal" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"observacao" text,
	"criadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"atualizadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "locacao" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"identidade" text NOT NULL,
	"codigo" varchar(40) NOT NULL,
	"situacao" varchar(20) DEFAULT 'aberta' NOT NULL,
	"datainicio" date NOT NULL,
	"cep" varchar(9),
	"endereco" varchar(120),
	"numeroendereco" varchar(20),
	"complemento" varchar(60),
	"bairro" varchar(60),
	"idcidade" text,
	"idestado" text,
	"valorperiodo" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"valormora" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"valortotal" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"datadevolucao" date,
	"formapagamento" varchar(10),
	"vencimento" date,
	"idtipodocumento" text,
	"idplanocontas" text,
	"idcontacorrente" text,
	"idfinanceiro" text,
	"observacao" text,
	"criadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"atualizadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "locacao_item" (
	"id" text PRIMARY KEY NOT NULL,
	"idlocacao" text NOT NULL,
	"idequipamento" text NOT NULL,
	"periodo" varchar(20) NOT NULL,
	"quantidade" integer NOT NULL,
	"valorunitario" numeric(12, 2) NOT NULL,
	"valordiaria" numeric(12, 2) NOT NULL,
	"dataprevista" date NOT NULL,
	"valorperiodo" numeric(12, 2) NOT NULL,
	"valormora" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"valortotal" numeric(12, 2) NOT NULL,
	"diasatraso" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "equipamento" ADD CONSTRAINT "equipamento_idempresa_fkey" FOREIGN KEY ("idempresa") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "locacao" ADD CONSTRAINT "locacao_idempresa_fkey" FOREIGN KEY ("idempresa") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "locacao" ADD CONSTRAINT "locacao_identidade_fkey" FOREIGN KEY ("identidade") REFERENCES "public"."entidade"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "locacao" ADD CONSTRAINT "locacao_idtipodocumento_fkey" FOREIGN KEY ("idtipodocumento") REFERENCES "public"."tipodocumentofinanceiro"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "locacao" ADD CONSTRAINT "locacao_idplanocontas_fkey" FOREIGN KEY ("idplanocontas") REFERENCES "public"."planocontas"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "locacao" ADD CONSTRAINT "locacao_idcontacorrente_fkey" FOREIGN KEY ("idcontacorrente") REFERENCES "public"."contacorrente"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "locacao" ADD CONSTRAINT "locacao_idfinanceiro_fkey" FOREIGN KEY ("idfinanceiro") REFERENCES "public"."financeiro"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "locacao_item" ADD CONSTRAINT "locacao_item_idlocacao_fkey" FOREIGN KEY ("idlocacao") REFERENCES "public"."locacao"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "locacao_item" ADD CONSTRAINT "locacao_item_idequipamento_fkey" FOREIGN KEY ("idequipamento") REFERENCES "public"."equipamento"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "equipamento_empresa_codigo_uidx" ON "equipamento" USING btree ("idempresa","codigo");--> statement-breakpoint
CREATE INDEX "equipamento_idempresa_idx" ON "equipamento" USING btree ("idempresa");--> statement-breakpoint
CREATE INDEX "equipamento_situacao_idx" ON "equipamento" USING btree ("situacao");--> statement-breakpoint
CREATE UNIQUE INDEX "locacao_empresa_codigo_uidx" ON "locacao" USING btree ("idempresa","codigo");--> statement-breakpoint
CREATE INDEX "locacao_idempresa_idx" ON "locacao" USING btree ("idempresa");--> statement-breakpoint
CREATE INDEX "locacao_identidade_idx" ON "locacao" USING btree ("identidade");--> statement-breakpoint
CREATE INDEX "locacao_situacao_idx" ON "locacao" USING btree ("situacao");--> statement-breakpoint
CREATE INDEX "locacao_item_idlocacao_idx" ON "locacao_item" USING btree ("idlocacao");--> statement-breakpoint
CREATE INDEX "locacao_item_idequipamento_idx" ON "locacao_item" USING btree ("idequipamento");

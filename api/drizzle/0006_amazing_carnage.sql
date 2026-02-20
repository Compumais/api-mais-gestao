CREATE TABLE "centrocusto" (
	"id" text PRIMARY KEY NOT NULL,
	"codigoextenso" varchar(85),
	"codigoreduzido" varchar(20),
	"currenttimemillis" bigint NOT NULL,
	"datacadastro" date DEFAULT now() NOT NULL,
	"dataultimaalteracao" date DEFAULT now() NOT NULL,
	"idempresa" text NOT NULL,
	"idultimousuarioalteracao" text NOT NULL,
	"idusuariocadastro" text NOT NULL,
	"inativo" integer DEFAULT 0,
	"obrigatorio" integer DEFAULT 0,
	"idcentrocustopai" text,
	"nivelcentro" integer,
	"nivelcentro1" varchar(20),
	"nivelcentro2" varchar(20),
	"nivelcentro3" varchar(20),
	"nivelcentro4" varchar(20),
	"nivelcentro5" varchar(20),
	"nivelcentro6" varchar(20),
	"nivelcentro7" varchar(20),
	"nivelcentro8" varchar(20),
	"nivelcentro9" varchar(20),
	"nome" varchar(50) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "codigoreduzidocontacontabil" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"currenttimemillis" bigint NOT NULL,
	"datacadastro" date DEFAULT now() NOT NULL,
	"dataultimaalteracao" date DEFAULT now() NOT NULL,
	"idultimousuarioalteracao" text NOT NULL,
	"idusuariocadastro" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacontabil" (
	"id" text PRIMARY KEY NOT NULL,
	"idcontapai" text,
	"idempresa" text NOT NULL,
	"inativo" integer DEFAULT 0,
	"descricao" varchar(100) NOT NULL,
	"codigocontareferencial" varchar(60),
	"codigoextenso" varchar(85),
	"codigoreduzido" varchar(20),
	"contaglutinadora" integer,
	"currenttimemillis" bigint NOT NULL,
	"datacadastro" date DEFAULT now() NOT NULL,
	"dataultimaalteracao" date DEFAULT now() NOT NULL,
	"idultimousuarioalteracao" text NOT NULL,
	"idusuariocadastro" text NOT NULL,
	"natureza" varchar(1),
	"nivelconta" integer,
	"numeronivel1" varchar(20),
	"numeronivel2" varchar(20),
	"numeronivel3" varchar(20),
	"numeronivel4" varchar(20),
	"numeronivel5" varchar(20),
	"numeronivel6" varchar(20),
	"numeronivel7" varchar(20),
	"numeronivel8" varchar(20),
	"numeronivel9" varchar(20),
	"tipocontacontabil" varchar(1)
);
--> statement-breakpoint
CREATE TABLE "entidadecontacontabil" (
	"id" text PRIMARY KEY NOT NULL,
	"idcontacontabil" text NOT NULL,
	"idempresa" text NOT NULL,
	"identidade" text NOT NULL,
	"currenttimemillis" bigint NOT NULL,
	"datacadastro" date DEFAULT now() NOT NULL,
	"dataultimaalteracao" date DEFAULT now() NOT NULL,
	"idultimousuarioalteracao" text NOT NULL,
	"idusuariocadastro" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integracaocontabilconfiguracao" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"currenttimemillis" bigint NOT NULL,
	"contabilizarclifordiversos" bigint DEFAULT 0,
	"idcontabaixarpagar" text,
	"idcontabaixarreceber" text,
	"idcontaclientediversos" text,
	"idcontafornecedordiversos" text
);
--> statement-breakpoint
CREATE TABLE "planocontascontacontabil" (
	"id" text PRIMARY KEY NOT NULL,
	"idcontacontabil" text,
	"idempresa" text,
	"idplanocontas" text,
	"currenttimemillis" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "empresas" ADD COLUMN "email" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "empresas" ADD COLUMN "endereco" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "plano" text;--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "plano_inicio_ciclo" date;--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "plano_fim_ciclo" date;--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "plano_proximo" text;--> statement-breakpoint
ALTER TABLE "centrocusto" ADD CONSTRAINT "centrocusto_idempresa_fkey" FOREIGN KEY ("idempresa") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "centrocusto" ADD CONSTRAINT "centrocusto_idultimousuarioalteracao_fkey" FOREIGN KEY ("idultimousuarioalteracao") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "centrocusto" ADD CONSTRAINT "centrocusto_idusuariocadastro_fkey" FOREIGN KEY ("idusuariocadastro") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "centrocusto" ADD CONSTRAINT "centrocusto_idcentrocustopai_fkey" FOREIGN KEY ("idcentrocustopai") REFERENCES "public"."centrocusto"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "codigoreduzidocontacontabil" ADD CONSTRAINT "codigoreduzidocontacontabil_idempresa_fkey" FOREIGN KEY ("idempresa") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "codigoreduzidocontacontabil" ADD CONSTRAINT "codigoreduzidocontacontabil_idultimousuarioalteracao_fkey" FOREIGN KEY ("idultimousuarioalteracao") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "codigoreduzidocontacontabil" ADD CONSTRAINT "codigoreduzidocontacontabil_idusuariocadastro_fkey" FOREIGN KEY ("idusuariocadastro") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "contacontabil" ADD CONSTRAINT "contacontabil_idempresa_fkey" FOREIGN KEY ("idempresa") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "contacontabil" ADD CONSTRAINT "contacontabil_idultimousuarioalteracao_fkey" FOREIGN KEY ("idultimousuarioalteracao") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "contacontabil" ADD CONSTRAINT "contacontabil_idusuariocadastro_fkey" FOREIGN KEY ("idusuariocadastro") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "contacontabil" ADD CONSTRAINT "contacontabil_idcontapai_fkey" FOREIGN KEY ("idcontapai") REFERENCES "public"."contacontabil"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "entidadecontacontabil" ADD CONSTRAINT "entidadecontacontabil_idempresa_fkey" FOREIGN KEY ("idempresa") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "entidadecontacontabil" ADD CONSTRAINT "entidadecontacontabil_idcontacontabil_fkey" FOREIGN KEY ("idcontacontabil") REFERENCES "public"."contacontabil"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "entidadecontacontabil" ADD CONSTRAINT "entidadecontacontabil_identidade_fkey" FOREIGN KEY ("identidade") REFERENCES "public"."entidade"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "entidadecontacontabil" ADD CONSTRAINT "entidadecontacontabil_idultimousuarioalteracao_fkey" FOREIGN KEY ("idultimousuarioalteracao") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "entidadecontacontabil" ADD CONSTRAINT "entidadecontacontabil_idusuariocadastro_fkey" FOREIGN KEY ("idusuariocadastro") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "integracaocontabilconfiguracao" ADD CONSTRAINT "integracaocontabilconfiguracao_idempresa_fkey" FOREIGN KEY ("idempresa") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "integracaocontabilconfiguracao" ADD CONSTRAINT "integracaocontabilconfiguracao_idcontabaixarpagar_fkey" FOREIGN KEY ("idcontabaixarpagar") REFERENCES "public"."contacontabil"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "integracaocontabilconfiguracao" ADD CONSTRAINT "integracaocontabilconfiguracao_idcontabaixarreceber_fkey" FOREIGN KEY ("idcontabaixarreceber") REFERENCES "public"."contacontabil"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "integracaocontabilconfiguracao" ADD CONSTRAINT "integracaocontabilconfiguracao_idcontaclientediversos_fkey" FOREIGN KEY ("idcontaclientediversos") REFERENCES "public"."contacontabil"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "integracaocontabilconfiguracao" ADD CONSTRAINT "integracaocontabilconfiguracao_idcontafornecedordiversos_fkey" FOREIGN KEY ("idcontafornecedordiversos") REFERENCES "public"."contacontabil"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "planocontascontacontabil" ADD CONSTRAINT "planocontascontacontabil_idempresa_fkey" FOREIGN KEY ("idempresa") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "planocontascontacontabil" ADD CONSTRAINT "planocontascontacontabil_idcontacontabil_fkey" FOREIGN KEY ("idcontacontabil") REFERENCES "public"."contacontabil"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "planocontascontacontabil" ADD CONSTRAINT "planocontascontacontabil_idplanocontas_fkey" FOREIGN KEY ("idplanocontas") REFERENCES "public"."planocontas"("id") ON DELETE cascade ON UPDATE cascade;
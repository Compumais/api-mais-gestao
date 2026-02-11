CREATE TABLE "assinaturas" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"idassinaturaasaas" text NOT NULL,
	"status" text NOT NULL,
	"plano" text NOT NULL,
	"valor" numeric(12, 2) NOT NULL,
	"ciclo" text NOT NULL,
	"proximovencimento" date,
	"urlpagamento" text,
	"criadoem" timestamp DEFAULT now() NOT NULL,
	"atualizadoem" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clientes_asaas" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"idclienteasaas" text NOT NULL,
	"criadoem" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assinaturas" ADD CONSTRAINT "assinaturas_idempresa_empresas_id_fk" FOREIGN KEY ("idempresa") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clientes_asaas" ADD CONSTRAINT "clientes_asaas_idempresa_empresas_id_fk" FOREIGN KEY ("idempresa") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assinaturas_idempresa_idx" ON "assinaturas" USING btree ("idempresa");--> statement-breakpoint
CREATE INDEX "assinaturas_idassinaturaasaas_idx" ON "assinaturas" USING btree ("idassinaturaasaas");--> statement-breakpoint
CREATE INDEX "clientes_asaas_idempresa_idx" ON "clientes_asaas" USING btree ("idempresa");
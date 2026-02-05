CREATE TABLE "banco" (
	"id" text PRIMARY KEY NOT NULL,
	"codigo" varchar(6) NOT NULL,
	"nome" varchar(60) NOT NULL,
	"currenttimemillis" bigint NOT NULL,
	"idempresa" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "usuarios" RENAME COLUMN "roles" TO "perfil";--> statement-breakpoint
ALTER TABLE "financeiro" ALTER COLUMN "identidade" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "banco" ADD CONSTRAINT "banco_idempresa_empresas_id_fk" FOREIGN KEY ("idempresa") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "banco" ADD CONSTRAINT "banco_idempresa_fkey" FOREIGN KEY ("idempresa") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE cascade;
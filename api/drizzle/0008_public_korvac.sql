CREATE TABLE "notificacoes" (
	"id" text PRIMARY KEY NOT NULL,
	"idusuario" text NOT NULL,
	"idempresa" text NOT NULL,
	"tipo" varchar(50) NOT NULL,
	"idrecurso" text,
	"titulo" text NOT NULL,
	"detalhes" jsonb,
	"lida" boolean DEFAULT false NOT NULL,
	"criadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_idusuario_usuarios_id_fk" FOREIGN KEY ("idusuario") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_idempresa_empresas_id_fk" FOREIGN KEY ("idempresa") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notificacoes_idusuario_idx" ON "notificacoes" USING btree ("idusuario");--> statement-breakpoint
CREATE INDEX "notificacoes_idusuario_lida_idx" ON "notificacoes" USING btree ("idusuario","lida");
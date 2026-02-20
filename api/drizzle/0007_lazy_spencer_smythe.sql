CREATE TABLE "configuracoes_usuario" (
	"id" text PRIMARY KEY NOT NULL,
	"idusuario" text NOT NULL,
	"integracoes" jsonb DEFAULT '{}'::jsonb,
	"criadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"atualizadoem" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "configuracoes_usuario" ADD CONSTRAINT "configuracoes_usuario_idusuario_fkey" FOREIGN KEY ("idusuario") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "configuracoes_usuario_idusuario_key" ON "configuracoes_usuario" USING btree ("idusuario");
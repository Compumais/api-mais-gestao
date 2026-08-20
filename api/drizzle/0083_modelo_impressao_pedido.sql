CREATE TABLE IF NOT EXISTS "modeloimpressaopedido" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"nome" varchar(120) NOT NULL,
	"descricao" varchar(255),
	"layout" jsonb NOT NULL DEFAULT '[]'::jsonb,
	"primario" boolean NOT NULL DEFAULT false,
	"sistema" boolean NOT NULL DEFAULT false,
	"ativo" boolean NOT NULL DEFAULT true,
	"datainclusao" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"atualizadoem" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "modeloimpressaopedido_idempresa_idx"
ON "modeloimpressaopedido" ("idempresa");

ALTER TABLE "modeloimpressaopedido"
ADD CONSTRAINT "modeloimpressaopedido_idempresa_fkey"
FOREIGN KEY ("idempresa") REFERENCES "public"."empresas"("id")
ON DELETE cascade ON UPDATE cascade;

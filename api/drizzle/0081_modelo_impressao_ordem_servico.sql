CREATE TABLE IF NOT EXISTS "modeloimpressaoordemservico" (
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

CREATE INDEX IF NOT EXISTS "modeloimpressaoordemservico_idempresa_idx"
ON "modeloimpressaoordemservico" ("idempresa");

DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE conname = 'modeloimpressaoordemservico_idempresa_fkey'
	) THEN
		ALTER TABLE "modeloimpressaoordemservico"
		ADD CONSTRAINT "modeloimpressaoordemservico_idempresa_fkey"
		FOREIGN KEY ("idempresa") REFERENCES "public"."empresas"("id")
		ON DELETE cascade ON UPDATE cascade;
	END IF;
END $$;

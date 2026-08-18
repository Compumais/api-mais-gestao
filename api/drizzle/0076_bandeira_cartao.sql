CREATE TABLE IF NOT EXISTS "bandeiracartao" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"codigo" varchar(30),
	"descricao" varchar(60) NOT NULL,
	"inativo" integer DEFAULT 0 NOT NULL,
	"currenttimemillis" bigint NOT NULL
);

CREATE INDEX IF NOT EXISTS "bandeiracartao_idempresa_idx"
	ON "bandeiracartao" ("idempresa");

DO $$ BEGIN
 ALTER TABLE "bandeiracartao" ADD CONSTRAINT "bandeiracartao_idempresa_fkey" FOREIGN KEY ("idempresa") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "grupogourmet" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"codigo" varchar(30),
	"nome" varchar(60) NOT NULL,
	"inativo" integer DEFAULT 0 NOT NULL
);

DO $$ BEGIN
 ALTER TABLE "grupogourmet" ADD CONSTRAINT "grupogourmet_idempresa_fkey" FOREIGN KEY ("idempresa") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "grupogourmet_idempresa_idx" ON "grupogourmet" USING btree ("idempresa");

ALTER TABLE "produtos" ADD COLUMN IF NOT EXISTS "idgrupogourmet" text;

DO $$ BEGIN
 ALTER TABLE "produtos" ADD CONSTRAINT "produtos_idgrupogourmet_fkey" FOREIGN KEY ("idgrupogourmet") REFERENCES "public"."grupogourmet"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

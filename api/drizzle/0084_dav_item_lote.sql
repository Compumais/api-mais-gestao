CREATE TABLE IF NOT EXISTS "davitemlote" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"iddavitem" text NOT NULL,
	"idlote" text,
	"numero" varchar(20) NOT NULL,
	"quantidade" numeric(18, 6) NOT NULL,
	"datafabricacao" date,
	"datavalidade" date,
	"codigoagregacao" varchar(20)
);

CREATE INDEX IF NOT EXISTS "davitemlote_item_idx" ON "davitemlote" ("iddavitem");
CREATE INDEX IF NOT EXISTS "davitemlote_lote_idx" ON "davitemlote" ("idlote");
CREATE INDEX IF NOT EXISTS "davitemlote_idempresa_idx" ON "davitemlote" ("idempresa");

ALTER TABLE "davitemlote"
ADD CONSTRAINT "davitemlote_idempresa_fkey"
FOREIGN KEY ("idempresa") REFERENCES "public"."empresas"("id")
ON DELETE cascade ON UPDATE cascade;

ALTER TABLE "davitemlote"
ADD CONSTRAINT "davitemlote_iddavitem_fkey"
FOREIGN KEY ("iddavitem") REFERENCES "public"."davitem"("id")
ON DELETE cascade ON UPDATE cascade;

ALTER TABLE "davitemlote"
ADD CONSTRAINT "davitemlote_idlote_fkey"
FOREIGN KEY ("idlote") REFERENCES "public"."lote"("id")
ON DELETE set null ON UPDATE cascade;

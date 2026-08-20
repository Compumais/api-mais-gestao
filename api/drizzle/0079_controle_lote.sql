ALTER TABLE "produtos" ADD COLUMN IF NOT EXISTS "controlalote" integer DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "produtos" ADD COLUMN IF NOT EXISTS "controlavalidade" integer DEFAULT 0;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lote" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"idproduto" text NOT NULL,
	"numero" varchar(20) NOT NULL,
	"datafabricacao" date,
	"datavalidade" date,
	"codigoagregacao" varchar(20),
	"quantidade" numeric(18, 6) DEFAULT '0' NOT NULL,
	"quantidadefiscal" numeric(18, 6) DEFAULT '0' NOT NULL,
	"inativo" smallint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "lote_empresa_produto_numero_key"
	ON "lote" ("idempresa", "idproduto", "numero");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lote_idempresa_idx" ON "lote" ("idempresa");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lote_idproduto_idx" ON "lote" ("idproduto");
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'lote_idempresa_fkey'
	) THEN
		ALTER TABLE "lote"
			ADD CONSTRAINT "lote_idempresa_fkey"
			FOREIGN KEY ("idempresa") REFERENCES "empresas"("id")
			ON DELETE cascade ON UPDATE cascade;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'lote_idproduto_fkey'
	) THEN
		ALTER TABLE "lote"
			ADD CONSTRAINT "lote_idproduto_fkey"
			FOREIGN KEY ("idproduto") REFERENCES "produtos"("id")
			ON DELETE restrict ON UPDATE cascade;
	END IF;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notafiscalitemlote" (
	"id" text PRIMARY KEY NOT NULL,
	"idempresa" text NOT NULL,
	"idnotafiscalitem" text NOT NULL,
	"idlote" text,
	"numero" varchar(20) NOT NULL,
	"quantidade" numeric(18, 6) NOT NULL,
	"datafabricacao" date,
	"datavalidade" date,
	"codigoagregacao" varchar(20)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notafiscalitemlote_item_idx"
	ON "notafiscalitemlote" ("idnotafiscalitem");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notafiscalitemlote_lote_idx"
	ON "notafiscalitemlote" ("idlote");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notafiscalitemlote_idempresa_idx"
	ON "notafiscalitemlote" ("idempresa");
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'notafiscalitemlote_idempresa_fkey'
	) THEN
		ALTER TABLE "notafiscalitemlote"
			ADD CONSTRAINT "notafiscalitemlote_idempresa_fkey"
			FOREIGN KEY ("idempresa") REFERENCES "empresas"("id")
			ON DELETE cascade ON UPDATE cascade;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'notafiscalitemlote_idnotafiscalitem_fkey'
	) THEN
		ALTER TABLE "notafiscalitemlote"
			ADD CONSTRAINT "notafiscalitemlote_idnotafiscalitem_fkey"
			FOREIGN KEY ("idnotafiscalitem") REFERENCES "notafiscalitem"("id")
			ON DELETE cascade ON UPDATE cascade;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'notafiscalitemlote_idlote_fkey'
	) THEN
		ALTER TABLE "notafiscalitemlote"
			ADD CONSTRAINT "notafiscalitemlote_idlote_fkey"
			FOREIGN KEY ("idlote") REFERENCES "lote"("id")
			ON DELETE set null ON UPDATE cascade;
	END IF;
END $$;

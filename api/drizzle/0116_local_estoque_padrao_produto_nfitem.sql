ALTER TABLE "localestoque" ADD COLUMN IF NOT EXISTS "padrao" smallint DEFAULT 0 NOT NULL;
--> statement-breakpoint
WITH primeiro_local AS (
	SELECT DISTINCT ON (idempresa) id
	FROM "localestoque"
	WHERE COALESCE(inativo, 0) = 0
	ORDER BY idempresa, padrao DESC, codigo ASC NULLS LAST, id ASC
)
UPDATE "localestoque"
SET "padrao" = 1
WHERE id IN (SELECT id FROM primeiro_local)
	AND NOT EXISTS (
		SELECT 1 FROM "localestoque" le2
		WHERE le2.idempresa = "localestoque".idempresa AND le2.padrao = 1
	);
--> statement-breakpoint
ALTER TABLE "produtos" ADD COLUMN IF NOT EXISTS "idlocalestoque" text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "produtos_idlocalestoque_idx" ON "produtos" USING btree ("idlocalestoque");
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "produtos" ADD CONSTRAINT "produtos_idlocalestoque_fkey" FOREIGN KEY ("idlocalestoque") REFERENCES "public"."localestoque"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "notafiscalitem" ADD COLUMN IF NOT EXISTS "idlocalestoque" text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notafiscalitem_idlocalestoque_idx" ON "notafiscalitem" USING btree ("idlocalestoque");
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notafiscalitem" ADD CONSTRAINT "fk_notafiscalitem_localestoque" FOREIGN KEY ("idlocalestoque") REFERENCES "public"."localestoque"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "cest" ALTER COLUMN "idempresa" DROP NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cest_codigo_idx" ON "cest" USING btree ("codigo" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "cest_codigo_global_uidx" ON "cest" ("codigo") WHERE "idempresa" IS NULL;

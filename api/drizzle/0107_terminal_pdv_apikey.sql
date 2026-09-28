ALTER TABLE "terminalpdv"
	ADD COLUMN IF NOT EXISTS "apikey_hash" text,
	ADD COLUMN IF NOT EXISTS "apikey_prefix" varchar(16),
	ADD COLUMN IF NOT EXISTS "instance_id" text,
	ADD COLUMN IF NOT EXISTS "instance_visto_em" timestamp(3);

CREATE UNIQUE INDEX IF NOT EXISTS "terminalpdv_apikey_hash_key"
	ON "terminalpdv" ("apikey_hash")
	WHERE "apikey_hash" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "terminalpdv_apikey_prefix_idx"
	ON "terminalpdv" ("apikey_prefix")
	WHERE "apikey_prefix" IS NOT NULL;

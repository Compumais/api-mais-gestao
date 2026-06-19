ALTER TABLE "produtos" ALTER COLUMN "ean" TYPE varchar(14) USING "ean"::text;
--> statement-breakpoint
ALTER TABLE "produtos" ALTER COLUMN "eantributavel" TYPE varchar(14) USING "eantributavel"::text;

-- CST PIS/COFINS devem ser códigos de 2 dígitos (varchar), não numeric.
ALTER TABLE "produtos" ALTER COLUMN "cstpis" SET DATA TYPE varchar(2) USING (
	CASE
		WHEN "cstpis" IS NULL THEN NULL
		ELSE LPAD(TRUNC("cstpis")::text, 2, '0')
	END
);
--> statement-breakpoint
ALTER TABLE "produtos" ALTER COLUMN "cstcofins" SET DATA TYPE varchar(2) USING (
	CASE
		WHEN "cstcofins" IS NULL THEN NULL
		ELSE LPAD(TRUNC("cstcofins")::text, 2, '0')
	END
);
--> statement-breakpoint
ALTER TABLE "produtos" ALTER COLUMN "cstpisentrada" SET DATA TYPE varchar(2) USING (
	CASE
		WHEN "cstpisentrada" IS NULL THEN NULL
		ELSE LPAD(TRUNC("cstpisentrada")::text, 2, '0')
	END
);
--> statement-breakpoint
ALTER TABLE "produtos" ALTER COLUMN "cstcofinsentrada" SET DATA TYPE varchar(2) USING (
	CASE
		WHEN "cstcofinsentrada" IS NULL THEN NULL
		ELSE LPAD(TRUNC("cstcofinsentrada")::text, 2, '0')
	END
);

DO $$ BEGIN
	IF to_regclass('public.contamesaitem') IS NOT NULL THEN
		ALTER TABLE "contamesaitem" ALTER COLUMN "unidademedida" SET DATA TYPE text;
	END IF;
END $$;

DO $$ BEGIN
	IF to_regclass('public.vendapdvgourmet') IS NOT NULL THEN
		ALTER TABLE "vendapdvgourmet" ADD COLUMN IF NOT EXISTS "valordinheiro" numeric(12, 3);
		ALTER TABLE "vendapdvgourmet" ADD COLUMN IF NOT EXISTS "valorcartao" numeric(12, 3);
		ALTER TABLE "vendapdvgourmet" ADD COLUMN IF NOT EXISTS "valorpix" numeric(12, 3);
		ALTER TABLE "vendapdvgourmet" ADD COLUMN IF NOT EXISTS "valorprepago" numeric(12, 3);
		ALTER TABLE "vendapdvgourmet" ADD COLUMN IF NOT EXISTS "valortroco" numeric(12, 3);
		ALTER TABLE "vendapdvgourmet" ADD COLUMN IF NOT EXISTS "valortotal" numeric(12, 3);
	END IF;
END $$;

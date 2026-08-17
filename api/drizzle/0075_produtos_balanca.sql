ALTER TABLE "produtos" ADD COLUMN IF NOT EXISTS "exportaBalanca" integer DEFAULT 0;
ALTER TABLE "produtos" ADD COLUMN IF NOT EXISTS "diasValidade" integer DEFAULT 0;

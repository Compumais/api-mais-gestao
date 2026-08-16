ALTER TABLE "produtos" ADD COLUMN IF NOT EXISTS "espizza" integer DEFAULT 0;

ALTER TABLE "vendapdvitem" ADD COLUMN IF NOT EXISTS "descricao" varchar(120);

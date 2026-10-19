ALTER TABLE "configuracao_pdv"
ADD COLUMN IF NOT EXISTS "vendasemestoque" smallint DEFAULT 0 NOT NULL;

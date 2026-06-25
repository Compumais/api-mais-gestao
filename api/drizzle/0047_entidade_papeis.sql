-- Papéis da entidade: fornecedor, cliente, transportador, representante
-- 0 = Não | 1 = Sim
ALTER TABLE "entidade" ADD COLUMN IF NOT EXISTS "fornecedor" smallint DEFAULT 0;
ALTER TABLE "entidade" ADD COLUMN IF NOT EXISTS "cliente" smallint DEFAULT 0;
ALTER TABLE "entidade" ADD COLUMN IF NOT EXISTS "transportador" smallint DEFAULT 0;
ALTER TABLE "entidade" ADD COLUMN IF NOT EXISTS "representante" smallint DEFAULT 0;

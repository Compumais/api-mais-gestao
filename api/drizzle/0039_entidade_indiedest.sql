-- Adiciona indicador de IE do destinatário para NF-e
-- 1 = Contribuinte ICMS | 2 = Contribuinte Isento | 9 = Não Contribuinte
ALTER TABLE "entidade" ADD COLUMN IF NOT EXISTS "indiedest" smallint;

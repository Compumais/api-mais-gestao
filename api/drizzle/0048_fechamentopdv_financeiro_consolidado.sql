-- Coluna ausente em produção: 0020 registrada no baseline mas não aplicada no schema.
ALTER TABLE "fechamentopdv" ADD COLUMN IF NOT EXISTS "financeiroconsolidadoem" timestamp;

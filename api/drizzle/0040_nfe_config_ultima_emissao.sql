-- Última CFOP, natureza de operação e série usadas na emissão de NF-e de venda
ALTER TABLE "nfeconfiguracao" ADD COLUMN IF NOT EXISTS "ultimacfopsaida" varchar(5);
ALTER TABLE "nfeconfiguracao" ADD COLUMN IF NOT EXISTS "ultimanatop" varchar(60);
ALTER TABLE "nfeconfiguracao" ADD COLUMN IF NOT EXISTS "ultimaidserie" text;

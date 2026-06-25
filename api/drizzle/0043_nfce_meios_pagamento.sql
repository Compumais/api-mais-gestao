ALTER TABLE "nfceconfiguracao"
	ADD COLUMN IF NOT EXISTS "meiospagamentonfce" jsonb NOT NULL DEFAULT '{"dinheiro":true,"cartao":true,"pix":true,"prepago":false}'::jsonb;

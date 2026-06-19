-- Opcional: adiciona coluna estoque na tabela produtos (ainda não aplicada em produção).
-- Após rodar esta migration, reintroduza o campo em drizzle/tables/produtos.ts.
ALTER TABLE "produtos" ADD COLUMN IF NOT EXISTS "estoque" numeric(12, 2) DEFAULT '0';

import { sql } from "drizzle-orm";

const idempresa = "c9368c74-d13a-471d-bcc6-4b76129b27e5";
const idproduto = "a7eec637-926b-435c-8c8e-864629a528f6";
const dataInicio = "2026-10-01";
const dataFim = "2026-10-31";

const q = sql`
SELECT COALESCE(
  (depois->>'preco')::numeric,
  (antes->>'preco')::numeric
) AS preco,
  criadoem::date::text AS data
FROM produto_historico
WHERE idempresa = ${idempresa}
  AND idproduto = ${idproduto}
  AND criadoem::date < ${dataInicio}::date
  AND (
    depois->>'preco' IS NOT NULL
    OR antes->>'preco' IS NOT NULL
  )
ORDER BY criadoem DESC
LIMIT 1
`;

console.log(JSON.stringify(q, null, 2));

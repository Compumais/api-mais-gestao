const { Client } = require('C:/Users/user/Documents/dev/api-mais-gestao/api/node_modules/pg');

const ID_EMPRESA = '95c8416a-ca95-4e3c-ab74-a3ca6b2a4b69';

const clientMG = new Client({ host: '82.29.60.9', port: 1861, database: 'mais_gestao', user: 'compumais', password: 'C0mpum415!33511861' });

async function testRelatorios() {
  await clientMG.connect();

  console.log('--- Testando Despesas por Categoria (com ABS) ---');
  const desp = await clientMG.query(`
    SELECT 
      COALESCE(pc.codigo, 'SEM-COD') AS codigo,
      COALESCE(pc.nome, 'Não categorizado') AS nome,
      ABS(COALESCE(SUM(ccl.valor::numeric), 0)) AS total
    FROM contacorrentelancamento ccl
    JOIN contacorrente cc ON cc.id = ccl.idcontacorrente
    LEFT JOIN planocontas pc ON pc.id = ccl.idplanocontas AND pc.idempresa = $1
    WHERE cc.idempresa = $1
      AND TRIM(ccl.tipo) IN ('S', 'D') AND ccl.idplanocontas IS NOT NULL
      AND ccl.datahora >= '2015-01-01'::date AND ccl.datahora <= '2026-12-31'::date
    GROUP BY COALESCE(pc.codigo, 'SEM-COD'), COALESCE(pc.nome, 'Não categorizado')
    ORDER BY total DESC
    LIMIT 10
  `, [ID_EMPRESA]);
  console.table(desp.rows);

  console.log('--- Testando Receitas por Categoria ---');
  const rec = await clientMG.query(`
    SELECT 
      COALESCE(pc.codigo, 'SEM-COD') AS codigo,
      COALESCE(pc.nome, 'Não categorizado') AS nome,
      COALESCE(SUM(ccl.valor::numeric), 0) AS total
    FROM contacorrentelancamento ccl
    JOIN contacorrente cc ON cc.id = ccl.idcontacorrente
    LEFT JOIN planocontas pc ON pc.id = ccl.idplanocontas AND pc.idempresa = $1
    WHERE cc.idempresa = $1
      AND TRIM(ccl.tipo) IN ('E', 'C') AND ccl.idplanocontas IS NOT NULL
      AND ccl.datahora >= '2015-01-01'::date AND ccl.datahora <= '2026-12-31'::date
    GROUP BY COALESCE(pc.codigo, 'SEM-COD'), COALESCE(pc.nome, 'Não categorizado')
    ORDER BY total DESC
    LIMIT 10
  `, [ID_EMPRESA]);
  console.table(rec.rows);

  await clientMG.end();
}
testRelatorios().catch(console.error);

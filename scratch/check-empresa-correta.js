const { Client } = require('C:/Users/user/Documents/dev/api-mais-gestao/api/node_modules/pg');

const ID_EMPRESA = '95c8416a-ca95-4e3c-ab74-a3ca6b2a4b69';

const clientMG = new Client({ host: '82.29.60.9', port: 1861, database: 'mais_gestao', user: 'compumais', password: 'C0mpum415!33511861' });

async function check() {
  await clientMG.connect();

  const planos = await clientMG.query('SELECT count(*) FROM planocontas WHERE idempresa = $1', [ID_EMPRESA]);
  console.log('Plano de contas na empresa:', planos.rows[0].count);

  const fin = await clientMG.query(`
    SELECT tipo, status, count(*) as total,
           count(idplanocontas) as com_plano,
           count(*) - count(idplanocontas) as sem_plano
    FROM financeiro
    WHERE idempresa = $1
    GROUP BY tipo, status
    ORDER BY tipo, status
  `, [ID_EMPRESA]);
  console.log('Financeiro status na empresa:');
  console.table(fin.rows);

  const fl = await clientMG.query(`
    SELECT count(*) as total, count(fl.evento) as com_evento
    FROM financeirolancamento fl
    JOIN financeiro f ON f.id = fl.idfinanceiro
    WHERE f.idempresa = $1
  `, [ID_EMPRESA]);
  console.log('Financeiro lancamentos na empresa:', fl.rows[0]);

  const cc = await clientMG.query('SELECT count(*) FROM contacorrente WHERE idempresa = $1', [ID_EMPRESA]);
  console.log('Conta corrente na empresa:', cc.rows[0].count);

  const ccl = await clientMG.query(`
    SELECT count(*) FROM contacorrentelancamento ccl
    JOIN contacorrente cc ON cc.id = ccl.idcontacorrente
    WHERE cc.idempresa = $1
  `, [ID_EMPRESA]);
  console.log('Conta corrente lancamentos na empresa:', ccl.rows[0].count);

  await clientMG.end();
}
check().catch(console.error);

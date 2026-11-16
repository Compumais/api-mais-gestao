const { Client } = require('C:/Users/user/Documents/dev/api-mais-gestao/api/node_modules/pg');

const ID_EMPRESA = '766df54b-0319-45f5-b28b-b3116091495c';

const clientMG = new Client({ host: '82.29.60.9', port: 1861, database: 'mais_gestao', user: 'compumais', password: 'C0mpum415!33511861' });

async function check() {
  await clientMG.connect();

  const cols = await clientMG.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'financeirolancamento' ORDER BY ordinal_position");
  console.log('Cols:', cols.rows.map(r => r.column_name).join(', '));

  const flCount = await clientMG.query(`
    SELECT count(*) as total,
           count(fl.evento) as com_evento
    FROM financeirolancamento fl
    JOIN financeiro f ON f.id = fl.idfinanceiro
    WHERE f.idempresa = $1
  `, [ID_EMPRESA]);
  console.log('financeirolancamento na empresa:', flCount.rows[0]);

  await clientMG.end();
}
check().catch(console.error);

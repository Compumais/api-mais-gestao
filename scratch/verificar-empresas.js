const { Client } = require('C:/Users/user/Documents/dev/api-mais-gestao/api/node_modules/pg');
const clientMG = new Client({ host: '82.29.60.9', port: 1861, database: 'mais_gestao', user: 'compumais', password: 'C0mpum415!33511861' });
clientMG.connect().then(async () => {
  const empCols = await clientMG.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'empresas'");
  console.log('Empresas cols:', empCols.rows.map(r => r.column_name).join(', '));

  const emp = await clientMG.query('SELECT * FROM empresas LIMIT 5');
  console.table(emp.rows);

  const finPorEmpresa = await clientMG.query('SELECT idempresa, count(*) FROM financeiro GROUP BY idempresa');
  console.log('Financeiro por empresa:');
  console.table(finPorEmpresa.rows);

  await clientMG.end();
}).catch(console.error);

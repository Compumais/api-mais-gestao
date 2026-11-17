const { Client } = require('C:/Users/user/Documents/dev/api-mais-gestao/api/node_modules/pg');
const clientMG = new Client({ host: '82.29.60.9', port: 1861, database: 'mais_gestao', user: 'compumais', password: 'C0mpum415!33511861' });
clientMG.connect().then(async () => {
  const s = await clientMG.query('SELECT id, idfinanceiro, evento, valor, baixa FROM financeirolancamento LIMIT 5');
  console.log('Sample financeirolancamento MG:');
  console.table(s.rows);

  const sampleFin = await clientMG.query("SELECT id, documento, valor FROM financeiro WHERE idempresa = '766df54b-0319-45f5-b28b-b3116091495c' LIMIT 5");
  console.log('Sample financeiro empresa:');
  console.table(sampleFin.rows);

  await clientMG.end();
}).catch(console.error);

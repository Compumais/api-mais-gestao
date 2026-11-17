const { Client } = require('C:/Users/user/Documents/dev/api-mais-gestao/api/node_modules/pg');
const clientMG = new Client({ host: '82.29.60.9', port: 1861, database: 'mais_gestao', user: 'compumais', password: 'C0mpum415!33511861' });
clientMG.connect().then(async () => {
  const d = await clientMG.query("SELECT valor, debito, tipo FROM contacorrentelancamento WHERE tipo = 'D' LIMIT 5");
  console.log('Tipo D (debito):');
  console.table(d.rows);
  const c = await clientMG.query("SELECT valor, debito, tipo FROM contacorrentelancamento WHERE tipo = 'C' LIMIT 5");
  console.log('Tipo C (credito):');
  console.table(c.rows);
  await clientMG.end();
}).catch(console.error);

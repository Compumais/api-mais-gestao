const { Client } = require('C:/Users/user/Documents/dev/api-mais-gestao/api/node_modules/pg');
const clientMG = new Client({ host: '82.29.60.9', port: 1861, database: 'mais_gestao', user: 'compumais', password: 'C0mpum415!33511861' });
clientMG.connect().then(async () => {
  const c = await clientMG.query(`
    SELECT conname, pg_get_constraintdef(c.oid)
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'financeirolancamento'
  `);
  console.table(c.rows);

  const flAny = await clientMG.query('SELECT count(*) FROM financeirolancamento');
  console.log('Total de financeirolancamento geral no MG (todas empresas):', flAny.rows[0].count);

  await clientMG.end();
}).catch(console.error);

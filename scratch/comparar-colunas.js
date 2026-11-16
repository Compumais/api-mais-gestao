const { Client } = require('C:/Users/user/Documents/dev/api-mais-gestao/api/node_modules/pg');

const clientUniplus = new Client({ host: '192.168.2.74', port: 5432, database: 'unico', user: 'postgres', password: 'postgres' });
const clientMG = new Client({ host: '82.29.60.9', port: 1861, database: 'mais_gestao', user: 'compumais', password: 'C0mpum415!33511861' });

async function check() {
  await clientUniplus.connect();
  await clientMG.connect();

  const upCC = await clientUniplus.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'contacorrente'");
  const mgCC = await clientMG.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'contacorrente'");
  const upCCSet = new Set(upCC.rows.map(r => r.column_name));
  const mgCCSet = new Set(mgCC.rows.map(r => r.column_name));
  const commonCC = [...upCCSet].filter(x => mgCCSet.has(x));

  console.log('Common contacorrente cols:', commonCC);

  const upCCL = await clientUniplus.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'contacorrentelancamento'");
  const mgCCL = await clientMG.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'contacorrentelancamento'");
  const upCCLSet = new Set(upCCL.rows.map(r => r.column_name));
  const mgCCLSet = new Set(mgCCL.rows.map(r => r.column_name));
  const commonCCL = [...upCCLSet].filter(x => mgCCLSet.has(x));

  console.log('Common contacorrentelancamento cols:', commonCCL);

  await clientUniplus.end();
  await clientMG.end();
}
check().catch(console.error);

const { Client } = require('pg');

const clientMG = new Client({
  host: '82.29.60.9',
  port: 1861,
  database: 'mais_gestao',
  user: 'compumais',
  password: 'C0mpum415!33511861'
});

async function run() {
  await clientMG.connect();
  const ccCols = await clientMG.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'contacorrente' ORDER BY ordinal_position");
  console.log('--- contacorrente cols (Mais Gestão) ---');
  console.table(ccCols.rows);

  const cclCols = await clientMG.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'contacorrentelancamento' ORDER BY ordinal_position");
  console.log('--- contacorrentelancamento cols (Mais Gestão) ---');
  console.table(cclCols.rows);

  const ccRows = await clientMG.query("SELECT count(*) FROM contacorrente WHERE idempresa = '766df54b-0319-45f5-b28b-b3116091495c'");
  const cclRows = await clientMG.query("SELECT count(*) FROM contacorrentelancamento ccl JOIN contacorrente cc ON cc.id = ccl.idcontacorrente WHERE cc.idempresa = '766df54b-0319-45f5-b28b-b3116091495c'");
  console.log('Registros atuais na empresa: contacorrente =', ccRows.rows[0].count, 'contacorrentelancamento =', cclRows.rows[0].count);

  await clientMG.end();
}
run().catch(console.error);

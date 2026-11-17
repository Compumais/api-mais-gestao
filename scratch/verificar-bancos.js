const { Client } = require('pg');

const clientUniplus = new Client({
  host: '192.168.2.74',
  port: 5432,
  database: 'unico',
  user: 'postgres',
  password: 'postgres'
});

const clientMG = new Client({
  host: '82.29.60.9',
  port: 1861,
  database: 'mais_gestao',
  user: 'compumais',
  password: 'C0mpum415!33511861'
});

async function run() {
  await clientUniplus.connect();
  await clientMG.connect();

  const upCC = await clientUniplus.query("SELECT id, codigo, descricao, idbanco, caixa FROM contacorrente ORDER BY id");
  console.log('UniPlus contacorrente sample:');
  console.table(upCC.rows);

  const mgBancos = await clientMG.query("SELECT id, codigo, nome FROM banco LIMIT 10");
  console.log('Mais Gestão bancos sample:');
  console.table(mgBancos.rows);

  await clientUniplus.end();
  await clientMG.end();
}
run().catch(console.error);

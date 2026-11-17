const { Client } = require('C:/Users/user/Documents/dev/api-mais-gestao/api/node_modules/pg');
const clientMG = new Client({ host: '82.29.60.9', port: 1861, database: 'mais_gestao', user: 'compumais', password: 'C0mpum415!33511861' });
clientMG.connect().then(async () => {
  const cc = await clientMG.query("SELECT id, codigo, descricao, idbanco, caixa FROM contacorrente WHERE idempresa = '95c8416a-ca95-4e3c-ab74-a3ca6b2a4b69'");
  console.log('CC existente:');
  console.table(cc.rows);
  if (cc.rows.length > 0) {
    const ccl = await clientMG.query("SELECT id, idcontacorrente, datahora, tipo, valor, historico, idplanocontas FROM contacorrentelancamento WHERE idcontacorrente = $1", [cc.rows[0].id]);
    console.log('CCL existente:');
    console.table(ccl.rows);
  }
  await clientMG.end();
}).catch(console.error);

const { Client } = require('C:/Users/user/Documents/dev/api-mais-gestao/api/node_modules/pg');
const clientMG = new Client({ host: '82.29.60.9', port: 1861, database: 'mais_gestao', user: 'compumais', password: 'C0mpum415!33511861' });
clientMG.connect().then(async () => {
  const d = await clientMG.query(`
    SELECT ccl.tipo, ccl.valor, ccl.debito
    FROM contacorrentelancamento ccl
    JOIN contacorrente cc ON cc.id = ccl.idcontacorrente
    WHERE cc.idempresa != '95c8416a-ca95-4e3c-ab74-a3ca6b2a4b69'
      AND ccl.tipo = 'D'
    LIMIT 5
  `);
  console.log('Outras empresas tipo D:');
  console.table(d.rows);

  const totalPorTipo = await clientMG.query(`
    SELECT tipo, count(*), sum(valor)
    FROM contacorrentelancamento ccl
    JOIN contacorrente cc ON cc.id = ccl.idcontacorrente
    WHERE cc.idempresa != '95c8416a-ca95-4e3c-ab74-a3ca6b2a4b69'
    GROUP BY tipo
  `);
  console.log('Outras empresas totais por tipo:');
  console.table(totalPorTipo.rows);

  await clientMG.end();
}).catch(console.error);

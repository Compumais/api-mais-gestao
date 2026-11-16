const { Client } = require('C:/Users/user/Documents/dev/api-mais-gestao/api/node_modules/pg');
const { v5: uuidv5 } = require('C:/Users/user/Documents/dev/api-mais-gestao/aplicativos/mais-migration/node_modules/uuid');

const NAMESPACE = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const ID_EMPRESA = '766df54b-0319-45f5-b28b-b3116091495c';

function destinationId(kind, externalId) {
  return uuidv5(`${ID_EMPRESA}:uniplus:${kind}:${String(externalId)}`, NAMESPACE);
}

const clientUniplus = new Client({ host: '192.168.2.74', port: 5432, database: 'unico', user: 'postgres', password: 'postgres' });
const clientMG = new Client({ host: '82.29.60.9', port: 1861, database: 'mais_gestao', user: 'compumais', password: 'C0mpum415!33511861' });

async function check() {
  await clientUniplus.connect();
  await clientMG.connect();
  
  const upPlanos = await clientUniplus.query('SELECT DISTINCT idplanocontas FROM contacorrentelancamento WHERE idplanocontas IS NOT NULL');
  console.log('UniPlus total distinct idplanocontas em contacorrentelancamento:', upPlanos.rows.length);

  const mgPlanos = await clientMG.query('SELECT id FROM planocontas WHERE idempresa = $1', [ID_EMPRESA]);
  const mgSet = new Set(mgPlanos.rows.map(r => r.id));
  console.log('Mais Gestão total planocontas cadastrados na empresa:', mgSet.size);

  let matchCount = 0;
  let missing = [];
  for (const row of upPlanos.rows) {
    const mgId = destinationId('plano_contas', row.idplanocontas);
    if (mgSet.has(mgId)) {
      matchCount++;
    } else {
      missing.push(row.idplanocontas);
    }
  }
  console.log('Matched planocontas:', matchCount, 'Missing:', missing.length);
  if (missing.length > 0) {
    console.log('Missing ids:', missing);
  }

  await clientUniplus.end();
  await clientMG.end();
}
check().catch(console.error);

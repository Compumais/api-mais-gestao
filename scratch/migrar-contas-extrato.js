const { Client } = require('C:/Users/user/Documents/dev/api-mais-gestao/api/node_modules/pg');
const { v5: uuidv5 } = require('C:/Users/user/Documents/dev/api-mais-gestao/aplicativos/mais-migration/node_modules/uuid');

const NAMESPACE = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const ID_EMPRESA = '95c8416a-ca95-4e3c-ab74-a3ca6b2a4b69';

function destinationId(kind, externalId) {
  return uuidv5(`${ID_EMPRESA}:uniplus:${kind}:${String(externalId)}`, NAMESPACE);
}

const clientUniplus = new Client({ host: '192.168.2.74', port: 5432, database: 'unico', user: 'postgres', password: 'postgres' });
const clientMG = new Client({ host: '82.29.60.9', port: 1861, database: 'mais_gestao', user: 'compumais', password: 'C0mpum415!33511861' });

async function migrate() {
  await clientUniplus.connect();
  await clientMG.connect();

  console.log('Conectado em ambos os bancos!');

  // 1. Mapeamento de bancos
  const upBanks = await clientUniplus.query('SELECT id, codigo FROM banco');
  const upBankCodeById = new Map(upBanks.rows.map(r => [String(r.id), r.codigo]));

  const mgBanks = await clientMG.query('SELECT id, codigo FROM banco');
  const mgBankIdByCode = new Map(mgBanks.rows.map(r => [r.codigo, r.id]));

  function mapBanco(upBancoId) {
    if (!upBancoId) return null;
    const code = upBankCodeById.get(String(upBancoId));
    if (!code) return null;
    return mgBankIdByCode.get(code) || null;
  }

  // 2. Buscar todas as contas correntes do UniPlus
  console.log('1. Lendo contacorrente do UniPlus...');
  const upCCResult = await clientUniplus.query('SELECT * FROM contacorrente ORDER BY id');
  console.log(`Encontradas ${upCCResult.rows.length} contas correntes.`);

  // Inserir contacorrente no Mais Gestão
  const ccCols = [
    'id', 'idempresa', 'codigo', 'descricao', 'idbanco', 'agencia', 'abertura',
    'numeroconta', 'gerente', 'telefonegerente', 'cnpjcpftitular', 'observacao',
    'agenciadv', 'contadv', 'codigocedente', 'codigocedentedv', 'carteira',
    'operacao', 'aceite', 'nossonumeroseq', 'especiedocumento', 'caixa',
    'caixapadrao', 'inativo', 'nometitular', 'chavepix'
  ];

  // Verificar quais colunas realmente existem em contacorrente no MG
  const mgCCCols = (await clientMG.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'contacorrente'")).rows.map(r => r.column_name);
  const mgCCColsSet = new Set(mgCCCols);
  const validCCCols = ccCols.filter(c => mgCCColsSet.has(c));

  console.log('Inserindo contacorrente no Mais Gestão...');
  for (const row of upCCResult.rows) {
    const mgId = destinationId('conta_corrente', row.id);
    const idbanco = mapBanco(row.idbanco);
    
    const insertData = {
      id: mgId,
      idempresa: ID_EMPRESA,
      codigo: row.codigo ? Number(row.codigo) : null,
      descricao: row.descricao || null,
      idbanco: idbanco,
      agencia: row.agencia || null,
      abertura: row.abertura || null,
      numeroconta: row.numeroconta || null,
      gerente: row.gerente || null,
      telefonegerente: row.telefonegerente || null,
      cnpjcpftitular: row.cnpjcpftitular || null,
      observacao: row.observacao || null,
      agenciadv: row.agenciadv || null,
      contadv: row.contadv || null,
      codigocedente: row.codigocedente || null,
      codigocedentedv: row.codigocedentedv || null,
      carteira: row.carteira || null,
      operacao: row.operacao || null,
      aceite: row.aceite != null ? Number(row.aceite) : null,
      nossonumeroseq: row.nossonumeroseq != null ? Number(row.nossonumeroseq) : null,
      especiedocumento: row.especiedocumento || null,
      caixa: row.caixa != null ? Number(row.caixa) : null,
      caixapadrao: row.caixapadrao != null ? Number(row.caixapadrao) : null,
      inativo: row.inativo != null ? Number(row.inativo) : 0,
      nometitular: row.nometitular || null,
      chavepix: row.pixchave || row.chavepix || null
    };

    const keys = validCCCols.filter(k => insertData[k] !== undefined);
    const values = keys.map(k => insertData[k]);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const updateClause = keys.filter(k => k !== 'id' && k !== 'idempresa').map(k => `"${k}" = EXCLUDED."${k}"`).join(', ');

    const sql = `
      INSERT INTO contacorrente (${keys.map(k => `"${k}"`).join(', ')})
      VALUES (${placeholders})
      ON CONFLICT (id) DO UPDATE SET ${updateClause}
    `;
    await clientMG.query(sql, values);
  }
  console.log('Contas correntes inseridas/atualizadas com sucesso!');

  // 3. Buscar e inserir contacorrentelancamento
  console.log('2. Lendo contacorrentelancamento do UniPlus...');
  const totalCountRes = await clientUniplus.query('SELECT count(*) FROM contacorrentelancamento');
  const totalLancs = Number(totalCountRes.rows[0].count);
  console.log(`Total de lançamentos no UniPlus: ${totalLancs}`);

  // Buscar todos os planos de contas existentes no Mais Gestão
  const mgPlanos = await clientMG.query('SELECT id FROM planocontas WHERE idempresa = $1', [ID_EMPRESA]);
  const mgPlanoSet = new Set(mgPlanos.rows.map(r => r.id));

  // Buscar todas as contas correntes existentes no Mais Gestão
  const mgCCs = await clientMG.query('SELECT id FROM contacorrente WHERE idempresa = $1', [ID_EMPRESA]);
  const mgCCSet = new Set(mgCCs.rows.map(r => r.id));

  const PAGE_SIZE = 2000;
  let offset = 0;
  let totalInserted = 0;

  const mgCCLCols = (await clientMG.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'contacorrentelancamento'")).rows.map(r => r.column_name);
  const mgCCLColsSet = new Set(mgCCLCols);

  const desiredCCLCols = [
    'id', 'idcontacorrente', 'datahora', 'tipo', 'valor', 'saldoanterior',
    'saldoatual', 'historico', 'idplanocontas', 'evento', 'debito', 'documento'
  ];
  const targetCCLCols = desiredCCLCols.filter(c => mgCCLColsSet.has(c));

  while (offset < totalLancs) {
    const pageRes = await clientUniplus.query(`
      SELECT id, idcontacorrente, datahora, tipo, valor, saldoanterior, saldoatual,
             historico, idplanocontas, evento, debito, documento
      FROM contacorrentelancamento
      ORDER BY id
      LIMIT $1 OFFSET $2
    `, [PAGE_SIZE, offset]);

    if (pageRes.rows.length === 0) break;

    const valuesArr = [];
    const rowsPlaceholders = [];
    let paramIndex = 1;

    for (const r of pageRes.rows) {
      const lancId = destinationId('conta_corrente_lancamento', r.id);
      const ccId = destinationId('conta_corrente', r.idcontacorrente);
      if (!mgCCSet.has(ccId)) {
        continue; // conta corrente inexistente
      }

      let planoId = null;
      if (r.idplanocontas) {
        const candidatePlano = destinationId('plano_contas', r.idplanocontas);
        if (mgPlanoSet.has(candidatePlano)) {
          planoId = candidatePlano;
        }
      }

      const rowMap = {
        id: lancId,
        idcontacorrente: ccId,
        datahora: r.datahora,
        tipo: r.tipo,
        valor: r.valor != null ? Number(r.valor) : 0,
        saldoanterior: r.saldoanterior != null ? Number(r.saldoanterior) : 0,
        saldoatual: r.saldoatual != null ? Number(r.saldoatual) : 0,
        historico: r.historico ? String(r.historico).substring(0, 5000) : null,
        idplanocontas: planoId,
        evento: r.evento != null ? Number(r.evento) : null,
        debito: r.debito != null ? Number(r.debito) : null,
        documento: r.documento ? String(r.documento).substring(0, 100) : null
      };

      const rowParams = [];
      for (const col of targetCCLCols) {
        valuesArr.push(rowMap[col]);
        rowParams.push(`$${paramIndex++}`);
      }
      rowsPlaceholders.push(`(${rowParams.join(', ')})`);
    }

    if (rowsPlaceholders.length > 0) {
      const updateClause = targetCCLCols
        .filter(c => c !== 'id' && c !== 'idcontacorrente')
        .map(c => `"${c}" = EXCLUDED."${c}"`)
        .join(', ');

      const bulkSql = `
        INSERT INTO contacorrentelancamento (${targetCCLCols.map(c => `"${c}"`).join(', ')})
        VALUES ${rowsPlaceholders.join(',\n')}
        ON CONFLICT (id) DO UPDATE SET ${updateClause}
      `;

      await clientMG.query(bulkSql, valuesArr);
      totalInserted += rowsPlaceholders.length;
    }

    offset += PAGE_SIZE;
    process.stdout.write(`\rImportados ${totalInserted} / ${totalLancs} lançamentos de conta corrente...`);
  }
  console.log(`\nFinalizada importação de lançamentos de conta corrente: ${totalInserted} registros!`);

  // 4. Vincular idplanocontas nos títulos de financeiro
  console.log('3. Atualizando idplanocontas nos títulos de financeiro...');
  
  // Update direto via financeirolancamento e contacorrentelancamento
  const updateFinRes = await clientMG.query(`
    UPDATE financeiro f
    SET idplanocontas = ccl.idplanocontas
    FROM financeirolancamento fl
    JOIN contacorrentelancamento ccl ON ccl.evento = fl.evento
    WHERE fl.idfinanceiro = f.id
      AND f.idempresa = $1
      AND ccl.idplanocontas IS NOT NULL
      AND f.idplanocontas IS NULL
  `, [ID_EMPRESA]);
  console.log(`Títulos de financeiro atualizados com idplanocontas via evento: ${updateFinRes.rowCount}`);

  // Verificar status final de financeiro
  const finFinal = await clientMG.query(`
    SELECT tipo, status, count(*) as total,
           count(idplanocontas) as com_plano,
           count(*) - count(idplanocontas) as sem_plano
    FROM financeiro
    WHERE idempresa = $1
    GROUP BY tipo, status
    ORDER BY tipo, status
  `, [ID_EMPRESA]);
  console.log('Resultado final em financeiro:');
  console.table(finFinal.rows);

  await clientUniplus.end();
  await clientMG.end();
}

migrate().catch(console.error);

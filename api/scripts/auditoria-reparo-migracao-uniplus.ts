import { sql } from "drizzle-orm";
import { db } from "../src/repositories/connection.js";

interface CruzamentoLancamento {
	idLancamento: string;
	idContaCorrente: string;
	idEmpresaContaCorrente: string;
	idPlanoContas: string;
	idEmpresaPlanoContas: string;
	planoCodigo: string | null;
	planoNome: string | null;
	valor: string;
	datahora: string;
	tipo: string;
}

interface CruzamentoFinanceiro {
	idFinanceiro: string;
	idEmpresaFinanceiro: string;
	idPlanoContas: string;
	idEmpresaPlanoContas: string;
	planoCodigo: string | null;
	planoNome: string | null;
	documento: string | null;
	valor: string;
}

async function auditarEReparar(aplicarCorrecao = false) {
	console.log("=".repeat(80));
	console.log("AUDITORIA E REPARO DE DADOS MULTI-EMPRESA (MIGRAÇÃO UNIPLUS)");
	console.log(`Modo: ${aplicarCorrecao ? "EXECUÇÃO / FIX" : "SIMULAÇÃO / DRY-RUN"}`);
	console.log("=".repeat(80));

	// 1. Identificar lançamentos de conta corrente com plano de contas de OUTRA empresa
	const cruzamentosCCL = await db.execute(sql`
		SELECT 
			ccl.id as id_lancamento,
			ccl.idcontacorrente,
			cc.idempresa as id_empresa_cc,
			ccl.idplanocontas,
			pc.idempresa as id_empresa_pc,
			pc.codigo as plano_codigo,
			pc.nome as plano_nome,
			ccl.valor::text,
			ccl.datahora::text,
			ccl.tipo
		FROM contacorrentelancamento ccl
		JOIN contacorrente cc ON cc.id = ccl.idcontacorrente
		JOIN planocontas pc ON pc.id = ccl.idplanocontas
		WHERE cc.idempresa <> pc.idempresa
	`);

	const listaCCL = (cruzamentosCCL.rows || cruzamentosCCL) as Record<string, unknown>[];
	console.log(`\n1. Lançamentos de Conta Corrente com Plano de Contas de OUTRA Empresa: ${listaCCL.length}`);

	if (listaCCL.length > 0) {
		const empresasAfetadas = new Set<string>();
		for (const row of listaCCL) {
			empresasAfetadas.add(String(row.id_empresa_cc));
			empresasAfetadas.add(String(row.id_empresa_pc));
		}
		console.log(`   Empresas envolvidas: ${Array.from(empresasAfetadas).join(", ")}`);
		console.log("   Exemplos de lançamentos afetados:");
		for (const row of listaCCL.slice(0, 5)) {
			console.log(`   - CCL ${row.id_lancamento}: CC pertence à empresa ${row.id_empresa_cc}, mas Plano ${row.plano_codigo} (${row.plano_nome}) pertence à empresa ${row.id_empresa_pc}`);
		}
	}

	// 2. Identificar títulos de financeiro com plano de contas de OUTRA empresa
	const cruzamentosFin = await db.execute(sql`
		SELECT 
			f.id as id_financeiro,
			f.idempresa as id_empresa_f,
			f.idplanocontas,
			pc.idempresa as id_empresa_pc,
			pc.codigo as plano_codigo,
			pc.nome as plano_nome,
			f.documento,
			f.valor::text
		FROM financeiro f
		JOIN planocontas pc ON pc.id = f.idplanocontas
		WHERE f.idempresa <> pc.idempresa
	`);

	const listaFin = (cruzamentosFin.rows || cruzamentosFin) as Record<string, unknown>[];
	console.log(`\n2. Títulos de Financeiro com Plano de Contas de OUTRA Empresa: ${listaFin.length}`);

	if (listaFin.length > 0) {
		for (const row of listaFin.slice(0, 5)) {
			console.log(`   - Título ${row.id_financeiro} (Doc: ${row.documento}): Empresa ${row.id_empresa_f}, mas Plano ${row.plano_codigo} (${row.plano_nome}) é da empresa ${row.id_empresa_pc}`);
		}
	}

	// 3. Se solicitado modo FIX, executar o desacoplamento e correção
	if (aplicarCorrecao) {
		console.log("\n[EXECUTANDO CORREÇÕES]");

		// A. Para lançamentos de conta corrente:
		// Tentar reatribuir ao plano de contas correspondente na mesma empresa da conta corrente
		let reparadosCCLPorEquivalencia = 0;
		let anuladosCCL = 0;

		for (const item of listaCCL) {
			const idEmpresaCorreta = String(item.id_empresa_cc);
			const codigoPlano = item.plano_codigo ? String(item.plano_codigo) : null;
			const nomePlano = item.plano_nome ? String(item.plano_nome) : null;

			let planoEquivalenteId: string | null = null;

			if (codigoPlano) {
				const busca = await db.execute(sql`
					SELECT id FROM planocontas 
					WHERE idempresa = ${idEmpresaCorreta} AND codigo = ${codigoPlano}
					LIMIT 1
				`);
				const r = (busca.rows || busca) as Record<string, unknown>[];
				if (r.length > 0) {
					planoEquivalenteId = String(r[0].id);
				}
			}

			if (!planoEquivalenteId && nomePlano) {
				const busca = await db.execute(sql`
					SELECT id FROM planocontas 
					WHERE idempresa = ${idEmpresaCorreta} AND LOWER(TRIM(nome)) = LOWER(TRIM(${nomePlano}))
					LIMIT 1
				`);
				const r = (busca.rows || busca) as Record<string, unknown>[];
				if (r.length > 0) {
					planoEquivalenteId = String(r[0].id);
				}
			}

			if (planoEquivalenteId) {
				await db.execute(sql`
					UPDATE contacorrentelancamento
					SET idplanocontas = ${planoEquivalenteId}
					WHERE id = ${String(item.id_lancamento)}
				`);
				reparadosCCLPorEquivalencia++;
			} else {
				// Desacopla para não vazar categoria privada da outra empresa
				await db.execute(sql`
					UPDATE contacorrentelancamento
					SET idplanocontas = NULL
					WHERE id = ${String(item.id_lancamento)}
				`);
				anuladosCCL++;
			}
		}

		console.log(`   CCL: ${reparadosCCLPorEquivalencia} reassociados ao plano equivalente da própria empresa.`);
		console.log(`   CCL: ${anuladosCCL} com plano desacoplado (NULL) para estancar o vazamento.`);

		// B. Para títulos de financeiro:
		let reparadosFinPorEquivalencia = 0;
		let anuladosFin = 0;

		for (const item of listaFin) {
			const idEmpresaCorreta = String(item.id_empresa_f);
			const codigoPlano = item.plano_codigo ? String(item.plano_codigo) : null;
			const nomePlano = item.plano_nome ? String(item.plano_nome) : null;

			let planoEquivalenteId: string | null = null;

			if (codigoPlano) {
				const busca = await db.execute(sql`
					SELECT id FROM planocontas 
					WHERE idempresa = ${idEmpresaCorreta} AND codigo = ${codigoPlano}
					LIMIT 1
				`);
				const r = (busca.rows || busca) as Record<string, unknown>[];
				if (r.length > 0) {
					planoEquivalenteId = String(r[0].id);
				}
			}

			if (!planoEquivalenteId && nomePlano) {
				const busca = await db.execute(sql`
					SELECT id FROM planocontas 
					WHERE idempresa = ${idEmpresaCorreta} AND LOWER(TRIM(nome)) = LOWER(TRIM(${nomePlano}))
					LIMIT 1
				`);
				const r = (busca.rows || busca) as Record<string, unknown>[];
				if (r.length > 0) {
					planoEquivalenteId = String(r[0].id);
				}
			}

			if (planoEquivalenteId) {
				await db.execute(sql`
					UPDATE financeiro
					SET idplanocontas = ${planoEquivalenteId}
					WHERE id = ${String(item.id_financeiro)}
				`);
				reparadosFinPorEquivalencia++;
			} else {
				await db.execute(sql`
					UPDATE financeiro
					SET idplanocontas = NULL
					WHERE id = ${String(item.id_financeiro)}
				`);
				anuladosFin++;
			}
		}

		console.log(`   Financeiro: ${reparadosFinPorEquivalencia} reassociados ao plano equivalente da própria empresa.`);
		console.log(`   Financeiro: ${anuladosFin} com plano desacoplado (NULL).`);
		console.log("\n[CORREÇÃO CONCLUÍDA COM SUCESSO]");
	} else {
		console.log("\n[AVISO] Para aplicar as correções acima no banco, execute com o parâmetro --fix:");
		console.log("   pnpm tsx scripts/auditoria-reparo-migracao-uniplus.ts --fix");
	}
	console.log("=".repeat(80));
}

const aplicar = process.argv.includes("--fix");
auditarEReparar(aplicar)
	.then(() => process.exit(0))
	.catch((err) => {
		console.error("Erro durante auditoria/reparo:", err);
		process.exit(1);
	});

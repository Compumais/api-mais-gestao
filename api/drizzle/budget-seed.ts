import * as dotenv from "dotenv";
import { and, eq, ilike, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { db } from "../src/repositories/connection.js";
import { buscarEmpresasDoUsuario } from "../src/repositories/entidade-repositories.js";
import { buscarPlanoContasPorCodigo } from "../src/repositories/plano-contas-repositories.js";
import { criarPlanoContasPadraoService } from "../src/service/planocontas/criar-plano-contas-padrao.js";
import { formatarValorMonetario } from "../src/util/recebimentos-venda-util.js";
import * as schema from "./schema.js";

dotenv.config();

const EMAIL_PADRAO = "cesar@compumais.com";
const NOME_EMPRESA = "compumais";

type BudgetMensalSeed = {
	codigoPlano: string;
	valorBase: number;
};

type BudgetAnualSeed = {
	codigoPlano: string;
	valor: number;
};

const BUDGETS_MENSAIS: BudgetMensalSeed[] = [
	{ codigoPlano: "2 1 1 1", valorBase: 4500 },
	{ codigoPlano: "2 1 1 3", valorBase: 2500 },
	{ codigoPlano: "2 1 2 1", valorBase: 2000 },
	{ codigoPlano: "2 1 3 1", valorBase: 1800 },
];

const BUDGETS_ANUAIS: BudgetAnualSeed[] = [
	{ codigoPlano: "2 1 1 2", valor: 60000 },
	{ codigoPlano: "2 1 2 2", valor: 24000 },
	{ codigoPlano: "3 1 6", valor: 36000 },
];

async function buscarUsuarioPorEmail(email: string) {
	const [usuario] = await db
		.select()
		.from(schema.usuarios)
		.where(eq(schema.usuarios.email, email))
		.limit(1);

	return usuario;
}

async function buscarEmpresaCompumais() {
	const [empresaPorNome] = await db
		.select({
			id: schema.empresa.id,
			nome: schema.empresa.nome,
		})
		.from(schema.empresa)
		.where(ilike(schema.empresa.nome, `%${NOME_EMPRESA}%`))
		.limit(1);

	if (empresaPorNome) {
		return empresaPorNome;
	}

	const email = process.env.SEED_EMAIL?.trim() || EMAIL_PADRAO;
	const usuario = await buscarUsuarioPorEmail(email);

	if (!usuario) {
		return null;
	}

	const empresasIds = await buscarEmpresasDoUsuario(usuario.id);
	const idempresa = empresasIds[0];

	if (!idempresa) {
		return null;
	}

	const [empresa] = await db
		.select({
			id: schema.empresa.id,
			nome: schema.empresa.nome,
		})
		.from(schema.empresa)
		.where(eq(schema.empresa.id, idempresa))
		.limit(1);

	return empresa ?? null;
}

async function contarBudgets(idempresa: string, ano: number) {
	const [resultado] = await db
		.select({ total: sql<number>`count(*)::int` })
		.from(schema.budget)
		.where(
			and(eq(schema.budget.idempresa, idempresa), eq(schema.budget.ano, ano)),
		);

	return resultado?.total ?? 0;
}

async function seedBudget() {
	const ano = Number(process.env.SEED_BUDGET_ANO) || new Date().getFullYear();
	const forcar = process.env.SEED_FORCE === "1";

	console.log(`🌱 Seed de budget para a empresa ${NOME_EMPRESA}\n`);

	const empresa = await buscarEmpresaCompumais();

	if (!empresa) {
		throw new Error(
			`Empresa ${NOME_EMPRESA} não encontrada (nem empresa vinculada a ${EMAIL_PADRAO})`,
		);
	}

	console.log(`  Empresa: ${empresa.nome}`);
	console.log(`  ID: ${empresa.id}`);
	console.log(`  Ano: ${ano}\n`);

	await criarPlanoContasPadraoService(empresa.id);

	const existentes = await contarBudgets(empresa.id, ano);

	if (existentes > 0 && !forcar) {
		console.log(
			`  ⚠️  Já existem ${existentes} budget(s) para ${ano}. Use SEED_FORCE=1 para recriar.`,
		);
		return;
	}

	if (existentes > 0 && forcar) {
		console.log("  ♻️  Removendo budgets anteriores do ano...");
		await db
			.delete(schema.budget)
			.where(
				and(
					eq(schema.budget.idempresa, empresa.id),
					eq(schema.budget.ano, ano),
				),
			);
	}

	const planosCache = new Map<string, string>();

	async function resolverPlano(codigo: string): Promise<string> {
		if (planosCache.has(codigo)) {
			return planosCache.get(codigo)!;
		}

		const plano = await buscarPlanoContasPorCodigo(empresa.id, codigo);

		if (!plano) {
			throw new Error(`Plano de contas não encontrado: ${codigo}`);
		}

		planosCache.set(codigo, plano.id);
		return plano.id;
	}

	const timestamp = Date.now();
	let inseridos = 0;

	for (const budgetMensal of BUDGETS_MENSAIS) {
		const idplanocontas = await resolverPlano(budgetMensal.codigoPlano);

		for (let mes = 1; mes <= 12; mes++) {
			const variacao = ((mes * 137) % 400) - 150;
			const valor = Math.max(100, budgetMensal.valorBase + variacao);

			await db.insert(schema.budget).values({
				id: uuidv4(),
				idempresa: empresa.id,
				idplanocontas,
				ano,
				periodicidade: "M",
				mes,
				valor: formatarValorMonetario(valor),
				currenttimemillis: timestamp,
			});

			inseridos++;
		}
	}

	for (const budgetAnual of BUDGETS_ANUAIS) {
		const idplanocontas = await resolverPlano(budgetAnual.codigoPlano);

		await db.insert(schema.budget).values({
			id: uuidv4(),
			idempresa: empresa.id,
			idplanocontas,
			ano,
			periodicidade: "A",
			mes: null,
			valor: formatarValorMonetario(budgetAnual.valor),
			currenttimemillis: timestamp,
		});

		inseridos++;
	}

	console.log("\n✅ Seed de budget concluído!");
	console.log(`  - ${BUDGETS_MENSAIS.length * 12} budgets mensais`);
	console.log(`  - ${BUDGETS_ANUAIS.length} budgets anuais`);
	console.log(`  - ${inseridos} registros inseridos`);
}

seedBudget()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error("❌ Erro ao executar seed de budget:", error);
		process.exit(1);
	});

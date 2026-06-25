import * as dotenv from "dotenv";
import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { db } from "../src/repositories/connection.js";
import {
	buscarContaCorrenteCaixaPadrao,
	criarContaCorrenteCaixaPadrao,
} from "../src/repositories/conta-corrente-repositories.js";
import { buscarEmpresasDoUsuario } from "../src/repositories/entidade-repositories.js";
import { buscarPlanoContasPorCodigo } from "../src/repositories/plano-contas-repositories.js";
import { criarPlanoContasPadraoService } from "../src/service/planocontas/criar-plano-contas-padrao.js";
import {
	CODIGO_PLANO_VENDAS_DINHEIRO,
	CODIGO_PLANO_VENDAS_PIX,
	formatarValorMonetario,
} from "../src/util/recebimentos-venda-util.js";
import * as schema from "./schema.js";

dotenv.config();

const EMAIL_PADRAO = "cesar@compumais.com";
const PREFIXO_DOCUMENTO = "SEED-DASH-";
const PREFIXO_HISTORICO = "[SEED-DASHBOARD]";

const CODIGOS_RECEITA = [
	CODIGO_PLANO_VENDAS_DINHEIRO,
	CODIGO_PLANO_VENDAS_PIX,
	"1 2",
] as const;

const CODIGOS_DESPESA = ["2 1 1 1", "2 1 1 3", "2 1 2 1", "2 1 3 1"] as const;

type LancamentoSeed = {
	datahora: string;
	tipo: "C" | "D";
	valor: number;
	codigoPlano: string;
	historico: string;
	sufixoDocumento: string;
};

function formatarData(data: Date): string {
	return data.toISOString().slice(0, 10);
}

function valorDeterministico(
	base: number,
	indice: number,
	multiplicador: number,
) {
	return base + ((indice * 137) % multiplicador);
}

async function buscarUsuarioPorEmail(email: string) {
	const [usuario] = await db
		.select()
		.from(schema.usuarios)
		.where(eq(schema.usuarios.email, email))
		.limit(1);

	return usuario;
}

async function seedJaExecutado(idempresa: string): Promise<boolean> {
	const [resultado] = await db
		.select({ total: sql<number>`count(*)::int` })
		.from(schema.financeiro)
		.where(
			and(
				eq(schema.financeiro.idempresa, idempresa),
				like(schema.financeiro.documento, `${PREFIXO_DOCUMENTO}%`),
			),
		);

	return (resultado?.total ?? 0) > 0;
}

async function removerSeedAnterior(idcontacorrente: string, idempresa: string) {
	await db
		.delete(schema.financeiro)
		.where(
			and(
				eq(schema.financeiro.idempresa, idempresa),
				like(schema.financeiro.documento, `${PREFIXO_DOCUMENTO}%`),
			),
		);

	await db
		.delete(schema.contacorrentelancamento)
		.where(
			or(
				like(schema.contacorrentelancamento.documento, `${PREFIXO_DOCUMENTO}%`),
				like(schema.contacorrentelancamento.historico, `${PREFIXO_HISTORICO}%`),
			),
		);

	await recalcularSaldosConta(idcontacorrente);
}

async function recalcularSaldosConta(idcontacorrente: string) {
	const lancamentos = await db
		.select()
		.from(schema.contacorrentelancamento)
		.where(eq(schema.contacorrentelancamento.idcontacorrente, idcontacorrente))
		.orderBy(
			schema.contacorrentelancamento.datahora,
			schema.contacorrentelancamento.currenttimemillis,
		);

	let saldo = 0;

	for (const lancamento of lancamentos) {
		const valor = Number(lancamento.valor ?? 0);
		const tipo = (lancamento.tipo ?? "C").trim();
		const saldoAnterior = saldo;
		saldo = tipo === "C" || tipo === "E" ? saldo + valor : saldo - valor;

		await db
			.update(schema.contacorrentelancamento)
			.set({
				saldoanterior: formatarValorMonetario(saldoAnterior),
				saldoatual: formatarValorMonetario(saldo),
			})
			.where(eq(schema.contacorrentelancamento.id, lancamento.id));
	}
}

async function buscarUltimoSaldo(idcontacorrente: string): Promise<number> {
	const [ultimo] = await db
		.select({ saldoatual: schema.contacorrentelancamento.saldoatual })
		.from(schema.contacorrentelancamento)
		.where(eq(schema.contacorrentelancamento.idcontacorrente, idcontacorrente))
		.orderBy(
			desc(schema.contacorrentelancamento.datahora),
			desc(schema.contacorrentelancamento.currenttimemillis),
		)
		.limit(1);

	return ultimo?.saldoatual ? Number(ultimo.saldoatual) : 0;
}

async function inserirLancamentoBancario(parametros: {
	idcontacorrente: string;
	idusuario: string;
	idplanocontas: string;
	tipo: "C" | "D";
	valor: number;
	historico: string;
	datahora: string;
	documento: string;
}) {
	const saldoAnterior = await buscarUltimoSaldo(parametros.idcontacorrente);
	const saldoAtual =
		parametros.tipo === "C"
			? saldoAnterior + parametros.valor
			: saldoAnterior - parametros.valor;

	await db.insert(schema.contacorrentelancamento).values({
		id: uuidv4(),
		idcontacorrente: parametros.idcontacorrente,
		datahora: parametros.datahora,
		tipo: parametros.tipo,
		valor: formatarValorMonetario(parametros.valor),
		saldoanterior: formatarValorMonetario(saldoAnterior),
		saldoatual: formatarValorMonetario(saldoAtual),
		historico: parametros.historico,
		idusuario: parametros.idusuario,
		idplanocontas: parametros.idplanocontas,
		documento: parametros.documento,
		currenttimemillis: Date.now(),
	});
}

function montarLancamentosMensais(): LancamentoSeed[] {
	const lancamentos: LancamentoSeed[] = [];
	const hoje = new Date();

	for (let mesesAtras = 13; mesesAtras >= 0; mesesAtras--) {
		const dataBase = new Date(
			hoje.getFullYear(),
			hoje.getMonth() - mesesAtras,
			5,
		);
		const indiceMes = 13 - mesesAtras;

		lancamentos.push({
			datahora: formatarData(
				new Date(dataBase.getFullYear(), dataBase.getMonth(), 5),
			),
			tipo: "C",
			valor: valorDeterministico(8500, indiceMes, 4000),
			codigoPlano: CODIGOS_RECEITA[indiceMes % CODIGOS_RECEITA.length]!,
			historico: `${PREFIXO_HISTORICO} Receita de vendas`,
			sufixoDocumento: `REC-${indiceMes}-1`,
		});

		lancamentos.push({
			datahora: formatarData(
				new Date(dataBase.getFullYear(), dataBase.getMonth(), 12),
			),
			tipo: "C",
			valor: valorDeterministico(3200, indiceMes, 2500),
			codigoPlano: CODIGOS_RECEITA[(indiceMes + 1) % CODIGOS_RECEITA.length]!,
			historico: `${PREFIXO_HISTORICO} Receita diversa`,
			sufixoDocumento: `REC-${indiceMes}-2`,
		});

		lancamentos.push({
			datahora: formatarData(
				new Date(dataBase.getFullYear(), dataBase.getMonth(), 18),
			),
			tipo: "D",
			valor: valorDeterministico(2800, indiceMes, 1800),
			codigoPlano: CODIGOS_DESPESA[indiceMes % CODIGOS_DESPESA.length]!,
			historico: `${PREFIXO_HISTORICO} Pagamento de salários`,
			sufixoDocumento: `DESP-${indiceMes}-1`,
		});

		lancamentos.push({
			datahora: formatarData(
				new Date(dataBase.getFullYear(), dataBase.getMonth(), 22),
			),
			tipo: "D",
			valor: valorDeterministico(1200, indiceMes, 900),
			codigoPlano: CODIGOS_DESPESA[(indiceMes + 2) % CODIGOS_DESPESA.length]!,
			historico: `${PREFIXO_HISTORICO} Despesa operacional`,
			sufixoDocumento: `DESP-${indiceMes}-2`,
		});
	}

	return lancamentos.sort((a, b) => a.datahora.localeCompare(b.datahora));
}

async function inserirTitulosFinanceiros(parametros: {
	idempresa: string;
	planoReceitaId: string;
	planoDespesaId: string;
}) {
	const hoje = new Date();
	const titulos: Array<{
		tipo: "P" | "R";
		diasOffset: number;
		valor: number;
		historico: string;
		planoId: string;
		sufixo: string;
	}> = [];

	for (let i = 0; i < 12; i++) {
		titulos.push({
			tipo: "R",
			diasOffset: i * 7,
			valor: 1500 + i * 250,
			historico: `${PREFIXO_HISTORICO} Conta a receber cliente`,
			planoId: parametros.planoReceitaId,
			sufixo: `CR-${i}`,
		});
		titulos.push({
			tipo: "P",
			diasOffset: i * 7 + 3,
			valor: 800 + i * 180,
			historico: `${PREFIXO_HISTORICO} Conta a pagar fornecedor`,
			planoId: parametros.planoDespesaId,
			sufixo: `CP-${i}`,
		});
	}

	for (const titulo of titulos) {
		const vencimento = new Date(hoje);
		vencimento.setDate(vencimento.getDate() - titulo.diasOffset);
		const dataIso = formatarData(vencimento);
		const registro = `${dataIso}T10:00:00.000Z`;

		await db.insert(schema.financeiro).values({
			id: uuidv4(),
			idempresa: parametros.idempresa,
			tipo: titulo.tipo,
			status: "A",
			emissao: dataIso,
			vencimento: dataIso,
			vencimentooriginal: dataIso,
			registro,
			valor: formatarValorMonetario(titulo.valor),
			saldo: formatarValorMonetario(titulo.valor),
			historico: titulo.historico,
			documento: `${PREFIXO_DOCUMENTO}${titulo.sufixo}`,
			idplanocontas: titulo.planoId,
			currenttimemillis: Date.now(),
		});
	}
}

async function seedFinanceiroDashboard() {
	const email = process.env.SEED_EMAIL?.trim() || EMAIL_PADRAO;
	const forcar = process.env.SEED_FORCE === "1";

	console.log(`🌱 Seed financeiro do dashboard para: ${email}\n`);

	const usuario = await buscarUsuarioPorEmail(email);

	if (!usuario) {
		throw new Error(`Usuário não encontrado com e-mail: ${email}`);
	}

	const empresasIds = await buscarEmpresasDoUsuario(usuario.id);

	if (empresasIds.length === 0) {
		throw new Error(`Nenhuma empresa vinculada ao usuário ${email}`);
	}

	const idempresa = empresasIds[0]!;

	const [empresa] = await db
		.select({ id: schema.empresa.id, nome: schema.empresa.nome })
		.from(schema.empresa)
		.where(eq(schema.empresa.id, idempresa))
		.limit(1);

	console.log(`  Empresa: ${empresa?.nome ?? idempresa}`);
	console.log(`  ID: ${idempresa}\n`);

	await criarPlanoContasPadraoService(idempresa);

	let caixa = await buscarContaCorrenteCaixaPadrao(idempresa);

	if (!caixa) {
		caixa = await criarContaCorrenteCaixaPadrao(idempresa);
	}

	if (!caixa) {
		throw new Error("Não foi possível obter a conta caixa padrão da empresa");
	}

	const jaExecutado = await seedJaExecutado(idempresa);

	if (jaExecutado && !forcar) {
		console.log(
			"  ⚠️  Seed já executado para esta empresa. Use SEED_FORCE=1 para recriar os dados fictícios.",
		);
		return;
	}

	if (jaExecutado && forcar) {
		console.log("  ♻️  Removendo dados fictícios anteriores...");
		await removerSeedAnterior(caixa.id, idempresa);
	}

	const planosCache = new Map<string, string>();

	async function resolverPlano(codigo: string): Promise<string> {
		if (planosCache.has(codigo)) {
			return planosCache.get(codigo)!;
		}

		const plano = await buscarPlanoContasPorCodigo(idempresa, codigo);

		if (!plano) {
			throw new Error(`Plano de contas não encontrado: ${codigo}`);
		}

		planosCache.set(codigo, plano.id);
		return plano.id;
	}

	const planoReceitaId = await resolverPlano(CODIGO_PLANO_VENDAS_DINHEIRO);
	const planoDespesaId = await resolverPlano("2 1 1 1");

	const lancamentos = montarLancamentosMensais();

	console.log(`  Inserindo ${lancamentos.length} lançamentos bancários...`);

	for (const lancamento of lancamentos) {
		const idplanocontas = await resolverPlano(lancamento.codigoPlano);

		await inserirLancamentoBancario({
			idcontacorrente: caixa.id,
			idusuario: usuario.id,
			idplanocontas,
			tipo: lancamento.tipo,
			valor: lancamento.valor,
			historico: lancamento.historico,
			datahora: lancamento.datahora,
			documento: `${PREFIXO_DOCUMENTO}${lancamento.sufixoDocumento}`,
		});
	}

	console.log("  Inserindo títulos financeiros (contas a pagar/receber)...");

	await inserirTitulosFinanceiros({
		idempresa,
		planoReceitaId,
		planoDespesaId,
	});

	const saldoFinal = await buscarUltimoSaldo(caixa.id);

	console.log("\n✅ Seed financeiro concluído!");
	console.log(`  - ${lancamentos.length} lançamentos em conta corrente`);
	console.log("  - 24 títulos financeiros (12 a pagar + 12 a receber)");
	console.log(`  - Saldo final do caixa: R$ ${saldoFinal.toFixed(2)}`);
}

seedFinanceiroDashboard().catch((error) => {
	console.error("❌ Erro ao executar seed financeiro:", error);
	process.exit(1);
});

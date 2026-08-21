import { and, desc, eq, sql } from "drizzle-orm";
import * as schema from "../../drizzle/schema.js";
import {
	calcularVariacaoPct,
	type KpiComVariacao,
	montarKpiComVariacao,
} from "../util/dashboard-periodo.js";
import { db } from "./connection.js";

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

export type { KpiComVariacao };

export type ParametrosPeriodo = {
	idempresa: string;
	dataInicioStr: string;
	dataFimStr: string;
};

export type EvolucaoFaturamentoItem = {
	date: string;
	total: number;
	quantidade: number;
};

export type TopProdutoAnalytics = {
	idproduto: string;
	nome: string;
	total: number;
	quantidade: number;
};

export type TopClienteAnalytics = {
	identidade: string;
	nome: string;
	total: number;
	quantidade: number;
};

export type ExecutivoDashboard = {
	faturamento: KpiComVariacao;
	lucroBruto: KpiComVariacao & { margemBrutaPct: number | null };
	lucroLiquido: KpiComVariacao & { margemLiquidaPct: number | null };
	caixa: {
		saldoAtual: number;
		entradasPrevistas: number;
		saidasPrevistas: number;
		saldoProjetado: number;
	};
	vendas: {
		quantidade: number;
		ticketMedio: number;
		itensVendidos: number;
		clientesAtendidos: number;
	};
	financeiro: {
		contasReceberAberto: number;
		contasPagarAberto: number;
		valorVencido: number;
		resultadoOperacional: number;
	};
	evolucaoFaturamento: EvolucaoFaturamentoItem[];
	receitasDespesas: { receitas: number; despesas: number };
	topProdutos: TopProdutoAnalytics[];
	topClientes: TopClienteAnalytics[];
};

export type VendasAvancadas = {
	faturamento: number;
	quantidadeVendas: number;
	ticketMedio: number;
	itensVendidos: number;
	clientesAtendidos: number;
	clientesNovos: number;
	clientesRecorrentes: number;
	ticketMedioNovos: number;
	ticketMedioRecorrentes: number;
	variacaoFaturamentoPct: number | null;
};

export type VendaPorHoraItem = {
	hora: number;
	total: number;
	quantidade: number;
};

export type VendaPorDiaSemanaItem = {
	diaSemana: number;
	total: number;
	quantidade: number;
};

export type RankingOrdenacao = "faturamento" | "quantidade" | "lucro" | "margem";

export type TopProdutoAvancado = {
	idproduto: string;
	nome: string;
	quantidade: number;
	faturamento: number;
	custo: number;
	lucro: number;
	margemPct: number | null;
};

export type MatrizProdutoItem = {
	idproduto: string;
	nome: string;
	vendas: number;
	faturamento: number;
	custo: number;
	lucro: number;
	margemPct: number | null;
};

export type AgingBucket = {
	faixa: string;
	quantidade: number;
	valor: number;
};

export type FinanceiroSaude = {
	receitas: number;
	despesas: number;
	resultado: number;
	saldoAtual: number;
	contasReceberAberto: number;
	contasPagarAberto: number;
	valorVencidoReceber: number;
	valorVencidoPagar: number;
	taxaInadimplenciaPct: number | null;
	agingReceber: AgingBucket[];
	agingPagar: AgingBucket[];
	topInadimplentes: {
		identidade: string | null;
		nome: string;
		valor: number;
		diasAtraso: number;
	}[];
};

export type FluxoCaixaDia = {
	date: string;
	entradas: number;
	saidas: number;
	saldo: number;
};

export type FluxoCaixaResposta = {
	modo: "historico" | "projetado";
	saldoInicial: number;
	dias: FluxoCaixaDia[];
};

export type DreAvancadoLinha = {
	id: string;
	nome: string;
	tipo: "receita" | "despesa" | "resultado";
	nivel: number;
	valor: number;
	percentualReceita: number | null;
};

export type DreAvancadoResposta = {
	granularidade: "ano" | "trimestre" | "mes";
	referencia: string;
	receitaTotal: number;
	linhas: DreAvancadoLinha[];
};

export type ComparativoFlexivelModo =
	| "ano_x_ano"
	| "mes_x_anterior"
	| "mes_x_yoy"
	| "personalizado";

export type ComparativoFlexivelItem = {
	label: string;
	periodoA: number;
	periodoB: number;
	variacaoPct: number | null;
};

export type ComparativoFlexivelResposta = {
	modo: ComparativoFlexivelModo;
	metricas: {
		faturamento: ComparativoFlexivelItem;
		receitas: ComparativoFlexivelItem;
		despesas: ComparativoFlexivelItem;
		resultado: ComparativoFlexivelItem;
	};
};

export type QuadranteRentabilidade =
	| "estrela"
	| "negociar"
	| "oportunidade"
	| "revisar";

export type RentabilidadeItem = {
	id: string;
	nome: string;
	quantidade: number;
	faturamento: number;
	custo: number;
	lucro: number;
	margemPct: number | null;
	quadrante: QuadranteRentabilidade;
};

export type RentabilidadeResposta = {
	dimensao: "produto" | "categoria";
	medianaVolume: number;
	medianaMargem: number;
	itens: RentabilidadeItem[];
};

export type ClientesAnalytics = {
	clientesAtendidos: number;
	clientesNovos: number;
	clientesRecorrentes: number;
	ticketMedio: number;
	faturamento: number;
	topClientes: TopClienteAnalytics[];
	novos: TopClienteAnalytics[];
	recorrentes: TopClienteAnalytics[];
};

export type SegmentoRfm =
	| "vip"
	| "fieis"
	| "risco"
	| "inativos"
	| "novos";

export type ClienteRfmItem = {
	identidade: string;
	nome: string;
	recenciaDias: number;
	frequencia: number;
	monetario: number;
	segmento: SegmentoRfm;
};

export type ClientesRfmResposta = {
	segmentos: Record<SegmentoRfm, number>;
	clientes: ClienteRfmItem[];
};

export type InsightSeveridade = "positivo" | "atencao" | "critico";

export type InsightItem = {
	severidade: InsightSeveridade;
	mensagem: string;
	tabAlvo: string;
	codigo: string;
};

/* -------------------------------------------------------------------------- */
/*                                  HELPERS                                   */
/* -------------------------------------------------------------------------- */

const toNumber = (value: unknown): number =>
	typeof value === "string" ? parseFloat(value) || 0 : Number(value) || 0;

const toDateString = (value: string | Date | null | undefined): string => {
	if (!value) return "";
	return (
		(typeof value === "string"
			? value.split("T")[0]
			: value.toISOString().split("T")[0]) ?? ""
	);
};

const rowsOf = <T>(result: { rows?: unknown } | unknown): T[] => {
	if (result && typeof result === "object" && "rows" in result) {
		const withRows = result as { rows?: unknown };
		if (Array.isArray(withRows.rows)) {
			return withRows.rows as T[];
		}
	}
	return (Array.isArray(result) ? result : []) as T[];
};

const CUSTO_UNITARIO_SQL = sql`COALESCE(p.customedioinicial::numeric, p.custoaquisicao::numeric, 0)`;

async function somarFaturamento(
	idempresa: string,
	dataInicioStr: string,
	dataFimStr: string,
): Promise<number> {
	const result = await db.execute(sql`
		SELECT COALESCE(SUM(valortotal::numeric), 0) as total
		FROM vendapdvgourmet
		WHERE idempresa = ${idempresa}
			AND datacriacao >= ${dataInicioStr}::date
			AND datacriacao < (${dataFimStr}::date + interval '1 day')
	`);
	return toNumber(rowsOf<{ total: string | number }>(result)[0]?.total);
}

async function somarCmv(
	idempresa: string,
	dataInicioStr: string,
	dataFimStr: string,
): Promise<number> {
	const result = await db.execute(sql`
		SELECT COALESCE(SUM(vi.quantidade::numeric * ${CUSTO_UNITARIO_SQL}), 0) as total
		FROM vendapdvitem vi
		JOIN vendapdvgourmet v ON v.id = vi.idvenda
		JOIN produtos p ON p.id = vi.idproduto
		WHERE vi.idempresa = ${idempresa}
			AND v.datacriacao >= ${dataInicioStr}::date
			AND v.datacriacao < (${dataFimStr}::date + interval '1 day')
	`);
	return toNumber(rowsOf<{ total: string | number }>(result)[0]?.total);
}

async function somarMovimentacoesPorTipo(
	idempresa: string,
	tipos: string[],
	dataInicioStr: string,
	dataFimStr: string,
): Promise<number> {
	const result = await db.execute(sql`
		SELECT COALESCE(SUM(ccl.valor::numeric), 0) as total
		FROM contacorrentelancamento ccl
		JOIN contacorrente cc ON cc.id = ccl.idcontacorrente
		WHERE cc.idempresa = ${idempresa}
			AND TRIM(ccl.tipo) IN (${sql.join(
				tipos.map((t) => sql`${t}`),
				sql`, `,
			)})
			AND ccl.datahora >= ${dataInicioStr}::date
			AND ccl.datahora < (${dataFimStr}::date + interval '1 day')
	`);
	return toNumber(rowsOf<{ total: string | number }>(result)[0]?.total);
}

async function buscarUltimosSaldos(ids: string[]): Promise<number> {
	if (!ids.length) return 0;

	const saldos = await Promise.all(
		ids.map(async (idcontacorrente) => {
			const [ultimo] = await db
				.select({
					saldoatual: schema.contacorrentelancamento.saldoatual,
				})
				.from(schema.contacorrentelancamento)
				.where(
					eq(schema.contacorrentelancamento.idcontacorrente, idcontacorrente),
				)
				.orderBy(
					sql`${schema.contacorrentelancamento.currenttimemillis} DESC NULLS LAST,
                        ${schema.contacorrentelancamento.datahora} DESC NULLS LAST`,
				)
				.limit(1);

			return toNumber(ultimo?.saldoatual);
		}),
	);

	return saldos.reduce((acc, saldo) => acc + saldo, 0);
}

async function buscarSaldoAtualCaixa(idempresa: string): Promise<number> {
	const contas = await db
		.select({ id: schema.contacorrente.id })
		.from(schema.contacorrente)
		.where(eq(schema.contacorrente.idempresa, idempresa));

	return buscarUltimosSaldos(contas.map((c) => c.id));
}

async function somarFinanceiroAberto(
	idempresa: string,
	tipo: "P" | "R",
	apenasVencido = false,
): Promise<number> {
	const result = await db.execute(sql`
		SELECT COALESCE(SUM(saldo::numeric), 0) as total
		FROM financeiro
		WHERE idempresa = ${idempresa}
			AND tipo = ${tipo}
			AND status = 'A'
			${apenasVencido ? sql`AND vencimento < CURRENT_DATE` : sql``}
	`);
	return toNumber(rowsOf<{ total: string | number }>(result)[0]?.total);
}

async function somarTitulosPrevistos(
	idempresa: string,
	tipo: "P" | "R",
	diasHorizonte = 30,
): Promise<number> {
	const result = await db.execute(sql`
		SELECT COALESCE(SUM(saldo::numeric), 0) as total
		FROM financeiro
		WHERE idempresa = ${idempresa}
			AND tipo = ${tipo}
			AND status = 'A'
			AND vencimento IS NOT NULL
			AND vencimento >= CURRENT_DATE
			AND vencimento <= CURRENT_DATE + (${diasHorizonte}::int)
	`);
	return toNumber(rowsOf<{ total: string | number }>(result)[0]?.total);
}

async function metricasVendasPeriodo(
	idempresa: string,
	dataInicioStr: string,
	dataFimStr: string,
) {
	const [vendasResult, itensResult, clientesResult] = await Promise.all([
		db.execute(sql`
			SELECT
				COALESCE(SUM(valortotal::numeric), 0) as faturamento,
				COUNT(*)::int as quantidade
			FROM vendapdvgourmet
			WHERE idempresa = ${idempresa}
				AND datacriacao >= ${dataInicioStr}::date
				AND datacriacao < (${dataFimStr}::date + interval '1 day')
		`),
		db.execute(sql`
			SELECT COALESCE(SUM(vi.quantidade::numeric), 0) as itens
			FROM vendapdvitem vi
			JOIN vendapdvgourmet v ON v.id = vi.idvenda
			WHERE vi.idempresa = ${idempresa}
				AND v.datacriacao >= ${dataInicioStr}::date
				AND v.datacriacao < (${dataFimStr}::date + interval '1 day')
		`),
		db.execute(sql`
			SELECT COUNT(DISTINCT identidade)::int as clientes
			FROM vendapdvgourmet
			WHERE idempresa = ${idempresa}
				AND identidade IS NOT NULL
				AND datacriacao >= ${dataInicioStr}::date
				AND datacriacao < (${dataFimStr}::date + interval '1 day')
		`),
	]);

	const vendas = rowsOf<{ faturamento: string | number; quantidade: number }>(
		vendasResult,
	)[0];
	const itens = rowsOf<{ itens: string | number }>(itensResult)[0];
	const clientes = rowsOf<{ clientes: number }>(clientesResult)[0];

	const faturamento = toNumber(vendas?.faturamento);
	const quantidade = vendas?.quantidade ?? 0;

	return {
		faturamento,
		quantidade,
		ticketMedio: quantidade > 0 ? faturamento / quantidade : 0,
		itensVendidos: toNumber(itens?.itens),
		clientesAtendidos: clientes?.clientes ?? 0,
	};
}

async function buscarEvolucaoFaturamento({
	idempresa,
	dataInicioStr,
	dataFimStr,
}: ParametrosPeriodo): Promise<EvolucaoFaturamentoItem[]> {
	const result = await db.execute(sql`
		SELECT
			DATE(datacriacao) as date,
			COALESCE(SUM(valortotal::numeric), 0) as total,
			COUNT(*)::int as quantidade
		FROM vendapdvgourmet
		WHERE idempresa = ${idempresa}
			AND datacriacao >= ${dataInicioStr}::date
			AND datacriacao < (${dataFimStr}::date + interval '1 day')
		GROUP BY DATE(datacriacao)
		ORDER BY DATE(datacriacao)
	`);

	return rowsOf<{
		date: string;
		total: string | number;
		quantidade: number;
	}>(result).map((row) => ({
		date: toDateString(row.date),
		total: toNumber(row.total),
		quantidade: row.quantidade,
	}));
}

async function buscarTopProdutosPeriodo(
	idempresa: string,
	dataInicioStr: string,
	dataFimStr: string,
	limit = 5,
): Promise<TopProdutoAnalytics[]> {
	const result = await db.execute(sql`
		SELECT
			vi.idproduto,
			COALESCE(p.nome, vi.descricao, 'Sem nome') as nome,
			COALESCE(SUM(vi.precototal::numeric), 0) as total,
			COALESCE(SUM(vi.quantidade::numeric), 0) as quantidade
		FROM vendapdvitem vi
		JOIN vendapdvgourmet v ON v.id = vi.idvenda
		LEFT JOIN produtos p ON p.id = vi.idproduto
		WHERE vi.idempresa = ${idempresa}
			AND v.datacriacao >= ${dataInicioStr}::date
			AND v.datacriacao < (${dataFimStr}::date + interval '1 day')
		GROUP BY vi.idproduto, p.nome, vi.descricao
		ORDER BY total DESC
		LIMIT ${limit}
	`);

	return rowsOf<{
		idproduto: string;
		nome: string;
		total: string | number;
		quantidade: string | number;
	}>(result).map((row) => ({
		idproduto: row.idproduto,
		nome: row.nome,
		total: toNumber(row.total),
		quantidade: toNumber(row.quantidade),
	}));
}

async function buscarTopClientesPeriodo(
	idempresa: string,
	dataInicioStr: string,
	dataFimStr: string,
	limit = 5,
): Promise<TopClienteAnalytics[]> {
	const result = await db.execute(sql`
		SELECT
			v.identidade,
			COALESCE(e.nome, 'Cliente sem nome') as nome,
			COALESCE(SUM(v.valortotal::numeric), 0) as total,
			COUNT(*)::int as quantidade
		FROM vendapdvgourmet v
		LEFT JOIN entidade e ON e.id = v.identidade
		WHERE v.idempresa = ${idempresa}
			AND v.identidade IS NOT NULL
			AND v.datacriacao >= ${dataInicioStr}::date
			AND v.datacriacao < (${dataFimStr}::date + interval '1 day')
		GROUP BY v.identidade, e.nome
		ORDER BY total DESC
		LIMIT ${limit}
	`);

	return rowsOf<{
		identidade: string;
		nome: string;
		total: string | number;
		quantidade: number;
	}>(result).map((row) => ({
		identidade: row.identidade,
		nome: row.nome,
		total: toNumber(row.total),
		quantidade: row.quantidade,
	}));
}

async function clientesNovosRecorrentes(
	idempresa: string,
	dataInicioStr: string,
	dataFimStr: string,
) {
	const result = await db.execute(sql`
		WITH vendas_periodo AS (
			SELECT identidade, valortotal::numeric as valor
			FROM vendapdvgourmet
			WHERE idempresa = ${idempresa}
				AND identidade IS NOT NULL
				AND datacriacao >= ${dataInicioStr}::date
				AND datacriacao < (${dataFimStr}::date + interval '1 day')
		),
		historico AS (
			SELECT DISTINCT identidade
			FROM vendapdvgourmet
			WHERE idempresa = ${idempresa}
				AND identidade IS NOT NULL
				AND datacriacao < ${dataInicioStr}::date
		)
		SELECT
			COUNT(DISTINCT CASE WHEN h.identidade IS NULL THEN vp.identidade END)::int as novos,
			COUNT(DISTINCT CASE WHEN h.identidade IS NOT NULL THEN vp.identidade END)::int as recorrentes,
			COALESCE(SUM(CASE WHEN h.identidade IS NULL THEN vp.valor ELSE 0 END), 0) as faturamento_novos,
			COALESCE(SUM(CASE WHEN h.identidade IS NOT NULL THEN vp.valor ELSE 0 END), 0) as faturamento_recorrentes,
			COUNT(CASE WHEN h.identidade IS NULL THEN 1 END)::int as vendas_novos,
			COUNT(CASE WHEN h.identidade IS NOT NULL THEN 1 END)::int as vendas_recorrentes
		FROM vendas_periodo vp
		LEFT JOIN historico h ON h.identidade = vp.identidade
	`);

	const row = rowsOf<{
		novos: number;
		recorrentes: number;
		faturamento_novos: string | number;
		faturamento_recorrentes: string | number;
		vendas_novos: number;
		vendas_recorrentes: number;
	}>(result)[0];

	const vendasNovos = row?.vendas_novos ?? 0;
	const vendasRecorrentes = row?.vendas_recorrentes ?? 0;
	const fatNovos = toNumber(row?.faturamento_novos);
	const fatRec = toNumber(row?.faturamento_recorrentes);

	return {
		clientesNovos: row?.novos ?? 0,
		clientesRecorrentes: row?.recorrentes ?? 0,
		ticketMedioNovos: vendasNovos > 0 ? fatNovos / vendasNovos : 0,
		ticketMedioRecorrentes:
			vendasRecorrentes > 0 ? fatRec / vendasRecorrentes : 0,
		faturamentoNovos: fatNovos,
		faturamentoRecorrentes: fatRec,
	};
}

function mediana(valores: number[]): number {
	if (valores.length === 0) return 0;
	const sorted = [...valores].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	if (sorted.length % 2 === 0) {
		return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
	}
	return sorted[mid] ?? 0;
}

function classificarQuadrante(
	volume: number,
	margem: number,
	medianaVolume: number,
	medianaMargem: number,
): QuadranteRentabilidade {
	const altoVolume = volume >= medianaVolume;
	const altaMargem = margem >= medianaMargem;
	if (altoVolume && altaMargem) return "estrela";
	if (altoVolume && !altaMargem) return "negociar";
	if (!altoVolume && altaMargem) return "oportunidade";
	return "revisar";
}

async function matrizProdutosBase({
	idempresa,
	dataInicioStr,
	dataFimStr,
}: ParametrosPeriodo): Promise<MatrizProdutoItem[]> {
	const result = await db.execute(sql`
		SELECT
			vi.idproduto,
			COALESCE(p.nome, vi.descricao, 'Sem nome') as nome,
			COALESCE(SUM(vi.quantidade::numeric), 0) as vendas,
			COALESCE(SUM(vi.precototal::numeric), 0) as faturamento,
			COALESCE(SUM(vi.quantidade::numeric * ${CUSTO_UNITARIO_SQL}), 0) as custo
		FROM vendapdvitem vi
		JOIN vendapdvgourmet v ON v.id = vi.idvenda
		LEFT JOIN produtos p ON p.id = vi.idproduto
		WHERE vi.idempresa = ${idempresa}
			AND v.datacriacao >= ${dataInicioStr}::date
			AND v.datacriacao < (${dataFimStr}::date + interval '1 day')
		GROUP BY vi.idproduto, p.nome, vi.descricao
	`);

	return rowsOf<{
		idproduto: string;
		nome: string;
		vendas: string | number;
		faturamento: string | number;
		custo: string | number;
	}>(result).map((row) => {
		const faturamento = toNumber(row.faturamento);
		const custo = toNumber(row.custo);
		const lucro = faturamento - custo;
		return {
			idproduto: row.idproduto,
			nome: row.nome,
			vendas: toNumber(row.vendas),
			faturamento,
			custo,
			lucro,
			margemPct: faturamento > 0 ? (lucro / faturamento) * 100 : null,
		};
	});
}

async function agingFinanceiro(
	idempresa: string,
	tipo: "P" | "R",
): Promise<AgingBucket[]> {
	const result = await db.execute(sql`
		SELECT
			CASE
				WHEN vencimento IS NULL THEN 'sem_vencimento'
				WHEN vencimento >= CURRENT_DATE THEN 'a_vencer'
				WHEN CURRENT_DATE - vencimento BETWEEN 1 AND 30 THEN '1_30'
				WHEN CURRENT_DATE - vencimento BETWEEN 31 AND 60 THEN '31_60'
				WHEN CURRENT_DATE - vencimento BETWEEN 61 AND 90 THEN '61_90'
				ELSE '90_mais'
			END as faixa,
			COUNT(*)::int as quantidade,
			COALESCE(SUM(saldo::numeric), 0) as valor
		FROM financeiro
		WHERE idempresa = ${idempresa}
			AND tipo = ${tipo}
			AND status = 'A'
		GROUP BY 1
	`);

	const mapa = new Map(
		rowsOf<{ faixa: string; quantidade: number; valor: string | number }>(
			result,
		).map((row) => [
			row.faixa,
			{ faixa: row.faixa, quantidade: row.quantidade, valor: toNumber(row.valor) },
		]),
	);

	const faixas = ["a_vencer", "1_30", "31_60", "61_90", "90_mais", "sem_vencimento"];
	return faixas.map(
		(faixa) => mapa.get(faixa) ?? { faixa, quantidade: 0, valor: 0 },
	);
}

/* -------------------------------------------------------------------------- */
/*                              EXECUTIVO                                     */
/* -------------------------------------------------------------------------- */

export async function buscarExecutivoDashboard({
	idempresa,
	dataInicioStr,
	dataFimStr,
	periodoAnterior,
	periodoYoY,
}: ParametrosPeriodo & {
	periodoAnterior: { dataInicioStr: string; dataFimStr: string };
	periodoYoY: { dataInicioStr: string; dataFimStr: string };
}): Promise<ExecutivoDashboard> {
	const [
		faturamento,
		faturamentoAnt,
		faturamentoYoY,
		cmv,
		cmvAnt,
		cmvYoY,
		receitas,
		despesas,
		receitasAnt,
		despesasAnt,
		receitasYoY,
		despesasYoY,
		saldoAtual,
		entradasPrevistas,
		saidasPrevistas,
		vendasAtual,
		contasReceberAberto,
		contasPagarAberto,
		valorVencidoR,
		valorVencidoP,
		evolucaoFaturamento,
		topProdutos,
		topClientes,
	] = await Promise.all([
		somarFaturamento(idempresa, dataInicioStr, dataFimStr),
		somarFaturamento(
			idempresa,
			periodoAnterior.dataInicioStr,
			periodoAnterior.dataFimStr,
		),
		somarFaturamento(idempresa, periodoYoY.dataInicioStr, periodoYoY.dataFimStr),
		somarCmv(idempresa, dataInicioStr, dataFimStr),
		somarCmv(
			idempresa,
			periodoAnterior.dataInicioStr,
			periodoAnterior.dataFimStr,
		),
		somarCmv(idempresa, periodoYoY.dataInicioStr, periodoYoY.dataFimStr),
		somarMovimentacoesPorTipo(idempresa, ["E", "C"], dataInicioStr, dataFimStr),
		somarMovimentacoesPorTipo(idempresa, ["S", "D"], dataInicioStr, dataFimStr),
		somarMovimentacoesPorTipo(
			idempresa,
			["E", "C"],
			periodoAnterior.dataInicioStr,
			periodoAnterior.dataFimStr,
		),
		somarMovimentacoesPorTipo(
			idempresa,
			["S", "D"],
			periodoAnterior.dataInicioStr,
			periodoAnterior.dataFimStr,
		),
		somarMovimentacoesPorTipo(
			idempresa,
			["E", "C"],
			periodoYoY.dataInicioStr,
			periodoYoY.dataFimStr,
		),
		somarMovimentacoesPorTipo(
			idempresa,
			["S", "D"],
			periodoYoY.dataInicioStr,
			periodoYoY.dataFimStr,
		),
		buscarSaldoAtualCaixa(idempresa),
		somarTitulosPrevistos(idempresa, "R", 30),
		somarTitulosPrevistos(idempresa, "P", 30),
		metricasVendasPeriodo(idempresa, dataInicioStr, dataFimStr),
		somarFinanceiroAberto(idempresa, "R"),
		somarFinanceiroAberto(idempresa, "P"),
		somarFinanceiroAberto(idempresa, "R", true),
		somarFinanceiroAberto(idempresa, "P", true),
		buscarEvolucaoFaturamento({ idempresa, dataInicioStr, dataFimStr }),
		buscarTopProdutosPeriodo(idempresa, dataInicioStr, dataFimStr),
		buscarTopClientesPeriodo(idempresa, dataInicioStr, dataFimStr),
	]);

	const lucroBruto = faturamento - cmv;
	const lucroBrutoAnt = faturamentoAnt - cmvAnt;
	const lucroBrutoYoY = faturamentoYoY - cmvYoY;
	const lucroLiquido = receitas - despesas;
	const lucroLiquidoAnt = receitasAnt - despesasAnt;
	const lucroLiquidoYoY = receitasYoY - despesasYoY;

	const kpiFaturamento = montarKpiComVariacao(
		faturamento,
		faturamentoAnt,
		faturamentoYoY,
	);
	const kpiLucroBruto = {
		...montarKpiComVariacao(lucroBruto, lucroBrutoAnt, lucroBrutoYoY),
		margemBrutaPct: faturamento > 0 ? (lucroBruto / faturamento) * 100 : null,
	};
	const kpiLucroLiquido = {
		...montarKpiComVariacao(lucroLiquido, lucroLiquidoAnt, lucroLiquidoYoY),
		margemLiquidaPct:
			receitas > 0 ? (lucroLiquido / receitas) * 100 : null,
	};

	return {
		faturamento: kpiFaturamento,
		lucroBruto: kpiLucroBruto,
		lucroLiquido: kpiLucroLiquido,
		caixa: {
			saldoAtual,
			entradasPrevistas,
			saidasPrevistas,
			saldoProjetado: saldoAtual + entradasPrevistas - saidasPrevistas,
		},
		vendas: {
			quantidade: vendasAtual.quantidade,
			ticketMedio: vendasAtual.ticketMedio,
			itensVendidos: vendasAtual.itensVendidos,
			clientesAtendidos: vendasAtual.clientesAtendidos,
		},
		financeiro: {
			contasReceberAberto,
			contasPagarAberto,
			valorVencido: valorVencidoR + valorVencidoP,
			resultadoOperacional: lucroLiquido,
		},
		evolucaoFaturamento,
		receitasDespesas: { receitas, despesas },
		topProdutos,
		topClientes,
	};
}

/* -------------------------------------------------------------------------- */
/*                               VENDAS                                       */
/* -------------------------------------------------------------------------- */

export async function buscarVendasAvancadas({
	idempresa,
	dataInicioStr,
	dataFimStr,
	periodoAnterior,
}: ParametrosPeriodo & {
	periodoAnterior: { dataInicioStr: string; dataFimStr: string };
}): Promise<VendasAvancadas> {
	const [atual, anterior, segmentos] = await Promise.all([
		metricasVendasPeriodo(idempresa, dataInicioStr, dataFimStr),
		metricasVendasPeriodo(
			idempresa,
			periodoAnterior.dataInicioStr,
			periodoAnterior.dataFimStr,
		),
		clientesNovosRecorrentes(idempresa, dataInicioStr, dataFimStr),
	]);

	return {
		faturamento: atual.faturamento,
		quantidadeVendas: atual.quantidade,
		ticketMedio: atual.ticketMedio,
		itensVendidos: atual.itensVendidos,
		clientesAtendidos: atual.clientesAtendidos,
		clientesNovos: segmentos.clientesNovos,
		clientesRecorrentes: segmentos.clientesRecorrentes,
		ticketMedioNovos: segmentos.ticketMedioNovos,
		ticketMedioRecorrentes: segmentos.ticketMedioRecorrentes,
		variacaoFaturamentoPct: calcularVariacaoPct(
			atual.faturamento,
			anterior.faturamento,
		),
	};
}

export async function buscarVendasPorHora({
	idempresa,
	dataInicioStr,
	dataFimStr,
}: ParametrosPeriodo): Promise<VendaPorHoraItem[]> {
	const result = await db.execute(sql`
		SELECT
			EXTRACT(HOUR FROM datacriacao)::int as hora,
			COALESCE(SUM(valortotal::numeric), 0) as total,
			COUNT(*)::int as quantidade
		FROM vendapdvgourmet
		WHERE idempresa = ${idempresa}
			AND datacriacao >= ${dataInicioStr}::date
			AND datacriacao < (${dataFimStr}::date + interval '1 day')
		GROUP BY EXTRACT(HOUR FROM datacriacao)
		ORDER BY hora
	`);

	const mapa = new Map(
		rowsOf<{ hora: number; total: string | number; quantidade: number }>(
			result,
		).map((row) => [
			Number(row.hora),
			{
				hora: Number(row.hora),
				total: toNumber(row.total),
				quantidade: row.quantidade,
			},
		]),
	);

	return Array.from({ length: 24 }, (_, hora) => mapa.get(hora) ?? {
		hora,
		total: 0,
		quantidade: 0,
	});
}

export async function buscarVendasPorDiaSemana({
	idempresa,
	dataInicioStr,
	dataFimStr,
}: ParametrosPeriodo): Promise<VendaPorDiaSemanaItem[]> {
	const result = await db.execute(sql`
		SELECT
			EXTRACT(DOW FROM datacriacao)::int as dia_semana,
			COALESCE(SUM(valortotal::numeric), 0) as total,
			COUNT(*)::int as quantidade
		FROM vendapdvgourmet
		WHERE idempresa = ${idempresa}
			AND datacriacao >= ${dataInicioStr}::date
			AND datacriacao < (${dataFimStr}::date + interval '1 day')
		GROUP BY EXTRACT(DOW FROM datacriacao)
		ORDER BY dia_semana
	`);

	const mapa = new Map(
		rowsOf<{
			dia_semana: number;
			total: string | number;
			quantidade: number;
		}>(result).map((row) => [
			Number(row.dia_semana),
			{
				diaSemana: Number(row.dia_semana),
				total: toNumber(row.total),
				quantidade: row.quantidade,
			},
		]),
	);

	return Array.from({ length: 7 }, (_, diaSemana) => mapa.get(diaSemana) ?? {
		diaSemana,
		total: 0,
		quantidade: 0,
	});
}

export async function buscarTopProdutosAvancado({
	idempresa,
	dataInicioStr,
	dataFimStr,
	ordenacao = "faturamento",
	limit = 20,
}: ParametrosPeriodo & {
	ordenacao?: RankingOrdenacao;
	limit?: number;
}): Promise<TopProdutoAvancado[]> {
	const itens = await matrizProdutosBase({
		idempresa,
		dataInicioStr,
		dataFimStr,
	});

	const sorted = [...itens].sort((a, b) => {
		switch (ordenacao) {
			case "quantidade":
				return b.vendas - a.vendas;
			case "lucro":
				return b.lucro - a.lucro;
			case "margem":
				return (b.margemPct ?? -Infinity) - (a.margemPct ?? -Infinity);
			default:
				return b.faturamento - a.faturamento;
		}
	});

	return sorted.slice(0, limit).map((item) => ({
		idproduto: item.idproduto,
		nome: item.nome,
		quantidade: item.vendas,
		faturamento: item.faturamento,
		custo: item.custo,
		lucro: item.lucro,
		margemPct: item.margemPct,
	}));
}

export async function buscarMatrizProdutos(
	params: ParametrosPeriodo,
): Promise<MatrizProdutoItem[]> {
	const itens = await matrizProdutosBase(params);
	return itens.sort((a, b) => b.faturamento - a.faturamento);
}

/* -------------------------------------------------------------------------- */
/*                             FINANCEIRO                                     */
/* -------------------------------------------------------------------------- */

export async function buscarFinanceiroSaude({
	idempresa,
	dataInicioStr,
	dataFimStr,
}: ParametrosPeriodo): Promise<FinanceiroSaude> {
	const [
		receitas,
		despesas,
		saldoAtual,
		contasReceberAberto,
		contasPagarAberto,
		valorVencidoReceber,
		valorVencidoPagar,
		agingReceber,
		agingPagar,
		inadimplentesResult,
		totalReceberHistoricoResult,
	] = await Promise.all([
		somarMovimentacoesPorTipo(idempresa, ["E", "C"], dataInicioStr, dataFimStr),
		somarMovimentacoesPorTipo(idempresa, ["S", "D"], dataInicioStr, dataFimStr),
		buscarSaldoAtualCaixa(idempresa),
		somarFinanceiroAberto(idempresa, "R"),
		somarFinanceiroAberto(idempresa, "P"),
		somarFinanceiroAberto(idempresa, "R", true),
		somarFinanceiroAberto(idempresa, "P", true),
		agingFinanceiro(idempresa, "R"),
		agingFinanceiro(idempresa, "P"),
		db.execute(sql`
			SELECT
				f.identidade,
				COALESCE(e.nome, f.emitente, 'Sem nome') as nome,
				COALESCE(SUM(f.saldo::numeric), 0) as valor,
				COALESCE(MAX(CURRENT_DATE - f.vencimento), 0)::int as dias_atraso
			FROM financeiro f
			LEFT JOIN entidade e ON e.id = f.identidade
			WHERE f.idempresa = ${idempresa}
				AND f.tipo = 'R'
				AND f.status = 'A'
				AND f.vencimento < CURRENT_DATE
			GROUP BY f.identidade, e.nome, f.emitente
			ORDER BY valor DESC
			LIMIT 10
		`),
		db.execute(sql`
			SELECT COALESCE(SUM(valor::numeric), 0) as total
			FROM financeiro
			WHERE idempresa = ${idempresa}
				AND tipo = 'R'
				AND vencimento >= ${dataInicioStr}::date
				AND vencimento <= ${dataFimStr}::date
		`),
	]);

	const totalReceberHistorico = toNumber(
		rowsOf<{ total: string | number }>(totalReceberHistoricoResult)[0]?.total,
	);

	return {
		receitas,
		despesas,
		resultado: receitas - despesas,
		saldoAtual,
		contasReceberAberto,
		contasPagarAberto,
		valorVencidoReceber,
		valorVencidoPagar,
		taxaInadimplenciaPct:
			totalReceberHistorico > 0
				? (valorVencidoReceber / totalReceberHistorico) * 100
				: null,
		agingReceber,
		agingPagar,
		topInadimplentes: rowsOf<{
			identidade: string | null;
			nome: string;
			valor: string | number;
			dias_atraso: number;
		}>(inadimplentesResult).map((row) => ({
			identidade: row.identidade,
			nome: row.nome,
			valor: toNumber(row.valor),
			diasAtraso: row.dias_atraso,
		})),
	};
}

export async function buscarFluxoCaixa({
	idempresa,
	dataInicioStr,
	dataFimStr,
	modo = "historico",
	horizonteDias = 30,
}: ParametrosPeriodo & {
	modo?: "historico" | "projetado";
	horizonteDias?: number;
}): Promise<FluxoCaixaResposta> {
	const saldoInicial = await buscarSaldoAtualCaixa(idempresa);

	if (modo === "projetado") {
		const hoje = new Date();
		hoje.setHours(0, 0, 0, 0);

		const result = await db.execute(sql`
			SELECT
				vencimento as date,
				COALESCE(SUM(CASE WHEN tipo = 'R' THEN saldo::numeric ELSE 0 END), 0) as entradas,
				COALESCE(SUM(CASE WHEN tipo = 'P' THEN saldo::numeric ELSE 0 END), 0) as saidas
			FROM financeiro
			WHERE idempresa = ${idempresa}
				AND status = 'A'
				AND vencimento IS NOT NULL
				AND vencimento >= CURRENT_DATE
				AND vencimento <= CURRENT_DATE + (${horizonteDias}::int)
			GROUP BY vencimento
			ORDER BY vencimento
		`);

		const mapa = new Map(
			rowsOf<{
				date: string;
				entradas: string | number;
				saidas: string | number;
			}>(result).map((row) => [
				toDateString(row.date),
				{
					entradas: toNumber(row.entradas),
					saidas: toNumber(row.saidas),
				},
			]),
		);

		let saldo = saldoInicial;
		const dias: FluxoCaixaDia[] = [];
		for (let i = 0; i <= horizonteDias; i++) {
			const data = new Date(hoje);
			data.setDate(data.getDate() + i);
			const dateStr =
				`${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
			const movimento = mapa.get(dateStr) ?? { entradas: 0, saidas: 0 };
			saldo = saldo + movimento.entradas - movimento.saidas;
			dias.push({
				date: dateStr,
				entradas: movimento.entradas,
				saidas: movimento.saidas,
				saldo,
			});
		}

		return { modo, saldoInicial, dias };
	}

	const result = await db.execute(sql`
		SELECT
			DATE(ccl.datahora) as date,
			COALESCE(SUM(CASE WHEN TRIM(ccl.tipo) IN ('E', 'C') THEN ccl.valor::numeric ELSE 0 END), 0) as entradas,
			COALESCE(SUM(CASE WHEN TRIM(ccl.tipo) IN ('S', 'D') THEN ccl.valor::numeric ELSE 0 END), 0) as saidas
		FROM contacorrentelancamento ccl
		JOIN contacorrente cc ON cc.id = ccl.idcontacorrente
		WHERE cc.idempresa = ${idempresa}
			AND ccl.datahora >= ${dataInicioStr}::date
			AND ccl.datahora < (${dataFimStr}::date + interval '1 day')
		GROUP BY DATE(ccl.datahora)
		ORDER BY DATE(ccl.datahora)
	`);

	const mapa = new Map(
		rowsOf<{
			date: string;
			entradas: string | number;
			saidas: string | number;
		}>(result).map((row) => [
			toDateString(row.date),
			{
				entradas: toNumber(row.entradas),
				saidas: toNumber(row.saidas),
			},
		]),
	);

	const inicio = new Date(`${dataInicioStr}T00:00:00`);
	const fim = new Date(`${dataFimStr}T00:00:00`);
	let saldo = saldoInicial;
	const dias: FluxoCaixaDia[] = [];

	for (
		let cursor = new Date(inicio);
		cursor <= fim;
		cursor.setDate(cursor.getDate() + 1)
	) {
		const dateStr =
			`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
		const movimento = mapa.get(dateStr) ?? { entradas: 0, saidas: 0 };
		saldo = saldo + movimento.entradas - movimento.saidas;
		dias.push({
			date: dateStr,
			entradas: movimento.entradas,
			saidas: movimento.saidas,
			saldo,
		});
	}

	return { modo: "historico", saldoInicial, dias };
}

/* -------------------------------------------------------------------------- */
/*                           DRE / COMPARATIVO                                */
/* -------------------------------------------------------------------------- */

function resolverIntervaloDre(params: {
	granularidade: "ano" | "trimestre" | "mes";
	ano?: number;
	mes?: number;
	trimestre?: number;
}): { dataInicioStr: string; dataFimStr: string; referencia: string } {
	const agora = new Date();
	const ano = params.ano ?? agora.getFullYear();

	if (params.granularidade === "ano") {
		return {
			dataInicioStr: `${ano}-01-01`,
			dataFimStr: `${ano}-12-31`,
			referencia: String(ano),
		};
	}

	if (params.granularidade === "trimestre") {
		const trimestre = params.trimestre ?? Math.floor(agora.getMonth() / 3) + 1;
		const mesInicio = (trimestre - 1) * 3 + 1;
		const mesFim = mesInicio + 2;
		const ultimoDia = new Date(ano, mesFim, 0).getDate();
		return {
			dataInicioStr: `${ano}-${String(mesInicio).padStart(2, "0")}-01`,
			dataFimStr: `${ano}-${String(mesFim).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`,
			referencia: `${ano}-T${trimestre}`,
		};
	}

	const mes = params.mes ?? agora.getMonth() + 1;
	const ultimoDia = new Date(ano, mes, 0).getDate();
	return {
		dataInicioStr: `${ano}-${String(mes).padStart(2, "0")}-01`,
		dataFimStr: `${ano}-${String(mes).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`,
		referencia: `${ano}-${String(mes).padStart(2, "0")}`,
	};
}

export async function buscarDreAvancado({
	idempresa,
	granularidade = "mes",
	ano,
	mes,
	trimestre,
}: {
	idempresa: string;
	granularidade?: "ano" | "trimestre" | "mes";
	ano?: number;
	mes?: number;
	trimestre?: number;
}): Promise<DreAvancadoResposta> {
	const { dataInicioStr, dataFimStr, referencia } = resolverIntervaloDre({
		granularidade,
		ano,
		mes,
		trimestre,
	});

	const [receitasRows, despesasRows] = await Promise.all([
		db.execute(sql`
			SELECT
				COALESCE(ccl.idplanocontas::text, 'sem-plano') as id,
				COALESCE(pc.nome, 'Sem plano de contas') as nome,
				COALESCE(SUM(ccl.valor::numeric), 0) as total
			FROM contacorrentelancamento ccl
			JOIN contacorrente cc ON cc.id = ccl.idcontacorrente
			LEFT JOIN planocontas pc ON pc.id = ccl.idplanocontas
			WHERE cc.idempresa = ${idempresa}
				AND TRIM(ccl.tipo) IN ('E', 'C')
				AND ccl.datahora >= ${dataInicioStr}::date
				AND ccl.datahora < (${dataFimStr}::date + interval '1 day')
			GROUP BY COALESCE(ccl.idplanocontas::text, 'sem-plano'), pc.nome
			ORDER BY total DESC
		`),
		db.execute(sql`
			SELECT
				COALESCE(ccl.idplanocontas::text, 'sem-plano') as id,
				COALESCE(pc.nome, 'Sem plano de contas') as nome,
				COALESCE(SUM(ccl.valor::numeric), 0) as total
			FROM contacorrentelancamento ccl
			JOIN contacorrente cc ON cc.id = ccl.idcontacorrente
			LEFT JOIN planocontas pc ON pc.id = ccl.idplanocontas
			WHERE cc.idempresa = ${idempresa}
				AND TRIM(ccl.tipo) IN ('S', 'D')
				AND ccl.datahora >= ${dataInicioStr}::date
				AND ccl.datahora < (${dataFimStr}::date + interval '1 day')
			GROUP BY COALESCE(ccl.idplanocontas::text, 'sem-plano'), pc.nome
			ORDER BY total DESC
		`),
	]);

	const receitas = rowsOf<{ id: string; nome: string; total: string | number }>(
		receitasRows,
	);
	const despesas = rowsOf<{ id: string; nome: string; total: string | number }>(
		despesasRows,
	);

	const receitaTotal = receitas.reduce((acc, row) => acc + toNumber(row.total), 0);
	const despesaTotal = despesas.reduce((acc, row) => acc + toNumber(row.total), 0);
	const resultado = receitaTotal - despesaTotal;

	const pct = (valor: number): number | null =>
		receitaTotal > 0 ? (valor / receitaTotal) * 100 : null;

	const linhas: DreAvancadoLinha[] = [
		{
			id: "receita-total",
			nome: "RECEITA TOTAL",
			tipo: "receita",
			nivel: 0,
			valor: receitaTotal,
			percentualReceita: 100,
		},
		...receitas.map((row) => ({
			id: `rec-${row.id}`,
			nome: row.nome,
			tipo: "receita" as const,
			nivel: 1,
			valor: toNumber(row.total),
			percentualReceita: pct(toNumber(row.total)),
		})),
		{
			id: "despesa-total",
			nome: "DESPESA TOTAL",
			tipo: "despesa",
			nivel: 0,
			valor: despesaTotal,
			percentualReceita: pct(despesaTotal),
		},
		...despesas.map((row) => ({
			id: `desp-${row.id}`,
			nome: row.nome,
			tipo: "despesa" as const,
			nivel: 1,
			valor: toNumber(row.total),
			percentualReceita: pct(toNumber(row.total)),
		})),
		{
			id: "resultado",
			nome: "RESULTADO LÍQUIDO",
			tipo: "resultado",
			nivel: 0,
			valor: resultado,
			percentualReceita: pct(resultado),
		},
	];

	return { granularidade, referencia, receitaTotal, linhas };
}

export async function buscarComparativoFlexivel({
	idempresa,
	modo,
	dataInicioStr,
	dataFimStr,
	dataInicioBStr,
	dataFimBStr,
}: {
	idempresa: string;
	modo: ComparativoFlexivelModo;
	dataInicioStr: string;
	dataFimStr: string;
	dataInicioBStr?: string;
	dataFimBStr?: string;
}): Promise<ComparativoFlexivelResposta> {
	const agora = new Date();
	let inicioA = dataInicioStr;
	let fimA = dataFimStr;
	let inicioB = dataInicioBStr ?? "";
	let fimB = dataFimBStr ?? "";

	if (modo === "ano_x_ano") {
		const ano = agora.getFullYear();
		inicioA = `${ano}-01-01`;
		fimA = `${ano}-12-31`;
		inicioB = `${ano - 1}-01-01`;
		fimB = `${ano - 1}-12-31`;
	} else if (modo === "mes_x_anterior") {
		const mesAtualInicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
		const mesAtualFim = new Date(agora.getFullYear(), agora.getMonth() + 1, 0);
		const mesAntInicio = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
		const mesAntFim = new Date(agora.getFullYear(), agora.getMonth(), 0);
		inicioA = toDateString(mesAtualInicio);
		fimA = toDateString(mesAtualFim);
		inicioB = toDateString(mesAntInicio);
		fimB = toDateString(mesAntFim);
	} else if (modo === "mes_x_yoy") {
		const mesAtualInicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
		const mesAtualFim = new Date(agora.getFullYear(), agora.getMonth() + 1, 0);
		const mesYoYInicio = new Date(agora.getFullYear() - 1, agora.getMonth(), 1);
		const mesYoYFim = new Date(agora.getFullYear() - 1, agora.getMonth() + 1, 0);
		inicioA = toDateString(mesAtualInicio);
		fimA = toDateString(mesAtualFim);
		inicioB = toDateString(mesYoYInicio);
		fimB = toDateString(mesYoYFim);
	}

	const [
		faturamentoA,
		faturamentoB,
		receitasA,
		receitasB,
		despesasA,
		despesasB,
	] = await Promise.all([
		somarFaturamento(idempresa, inicioA, fimA),
		somarFaturamento(idempresa, inicioB, fimB),
		somarMovimentacoesPorTipo(idempresa, ["E", "C"], inicioA, fimA),
		somarMovimentacoesPorTipo(idempresa, ["E", "C"], inicioB, fimB),
		somarMovimentacoesPorTipo(idempresa, ["S", "D"], inicioA, fimA),
		somarMovimentacoesPorTipo(idempresa, ["S", "D"], inicioB, fimB),
	]);

	const resultadoA = receitasA - despesasA;
	const resultadoB = receitasB - despesasB;

	const item = (
		label: string,
		periodoA: number,
		periodoB: number,
	): ComparativoFlexivelItem => ({
		label,
		periodoA,
		periodoB,
		variacaoPct: calcularVariacaoPct(periodoA, periodoB),
	});

	return {
		modo,
		metricas: {
			faturamento: item("Faturamento", faturamentoA, faturamentoB),
			receitas: item("Receitas", receitasA, receitasB),
			despesas: item("Despesas", despesasA, despesasB),
			resultado: item("Resultado", resultadoA, resultadoB),
		},
	};
}

/* -------------------------------------------------------------------------- */
/*                         RENTABILIDADE / CLIENTES                           */
/* -------------------------------------------------------------------------- */

export async function buscarRentabilidade({
	idempresa,
	dataInicioStr,
	dataFimStr,
	dimensao = "produto",
}: ParametrosPeriodo & {
	dimensao?: "produto" | "categoria";
}): Promise<RentabilidadeResposta> {
	if (dimensao === "categoria") {
		const result = await db.execute(sql`
			SELECT
				COALESCE(h.id, 'sem-categoria') as id,
				COALESCE(h.nome, 'Sem categoria') as nome,
				COALESCE(SUM(vi.quantidade::numeric), 0) as quantidade,
				COALESCE(SUM(vi.precototal::numeric), 0) as faturamento,
				COALESCE(SUM(vi.quantidade::numeric * ${CUSTO_UNITARIO_SQL}), 0) as custo
			FROM vendapdvitem vi
			JOIN vendapdvgourmet v ON v.id = vi.idvenda
			LEFT JOIN produtos p ON p.id = vi.idproduto
			LEFT JOIN hierarquia h ON h.id = p.idgrupo
			WHERE vi.idempresa = ${idempresa}
				AND v.datacriacao >= ${dataInicioStr}::date
				AND v.datacriacao < (${dataFimStr}::date + interval '1 day')
			GROUP BY COALESCE(h.id, 'sem-categoria'), COALESCE(h.nome, 'Sem categoria')
		`);

		const base = rowsOf<{
			id: string;
			nome: string;
			quantidade: string | number;
			faturamento: string | number;
			custo: string | number;
		}>(result).map((row) => {
			const faturamento = toNumber(row.faturamento);
			const custo = toNumber(row.custo);
			const lucro = faturamento - custo;
			return {
				id: row.id,
				nome: row.nome,
				quantidade: toNumber(row.quantidade),
				faturamento,
				custo,
				lucro,
				margemPct: faturamento > 0 ? (lucro / faturamento) * 100 : 0,
			};
		});

		const medianaVolume = mediana(base.map((i) => i.quantidade));
		const medianaMargem = mediana(base.map((i) => i.margemPct));

		return {
			dimensao,
			medianaVolume,
			medianaMargem,
			itens: base.map((item) => ({
				...item,
				margemPct: item.faturamento > 0 ? item.margemPct : null,
				quadrante: classificarQuadrante(
					item.quantidade,
					item.margemPct,
					medianaVolume,
					medianaMargem,
				),
			})),
		};
	}

	const produtos = await matrizProdutosBase({
		idempresa,
		dataInicioStr,
		dataFimStr,
	});

	const medianaVolume = mediana(produtos.map((i) => i.vendas));
	const medianaMargem = mediana(
		produtos.map((i) => i.margemPct ?? 0),
	);

	return {
		dimensao,
		medianaVolume,
		medianaMargem,
		itens: produtos.map((item) => ({
			id: item.idproduto,
			nome: item.nome,
			quantidade: item.vendas,
			faturamento: item.faturamento,
			custo: item.custo,
			lucro: item.lucro,
			margemPct: item.margemPct,
			quadrante: classificarQuadrante(
				item.vendas,
				item.margemPct ?? 0,
				medianaVolume,
				medianaMargem,
			),
		})),
	};
}

export async function buscarClientesAnalytics({
	idempresa,
	dataInicioStr,
	dataFimStr,
}: ParametrosPeriodo): Promise<ClientesAnalytics> {
	const [metricas, segmentos, topClientes, novosResult, recorrentesResult] =
		await Promise.all([
			metricasVendasPeriodo(idempresa, dataInicioStr, dataFimStr),
			clientesNovosRecorrentes(idempresa, dataInicioStr, dataFimStr),
			buscarTopClientesPeriodo(idempresa, dataInicioStr, dataFimStr, 10),
			db.execute(sql`
				WITH historico AS (
					SELECT DISTINCT identidade
					FROM vendapdvgourmet
					WHERE idempresa = ${idempresa}
						AND identidade IS NOT NULL
						AND datacriacao < ${dataInicioStr}::date
				)
				SELECT
					v.identidade,
					COALESCE(e.nome, 'Cliente sem nome') as nome,
					COALESCE(SUM(v.valortotal::numeric), 0) as total,
					COUNT(*)::int as quantidade
				FROM vendapdvgourmet v
				LEFT JOIN entidade e ON e.id = v.identidade
				LEFT JOIN historico h ON h.identidade = v.identidade
				WHERE v.idempresa = ${idempresa}
					AND v.identidade IS NOT NULL
					AND h.identidade IS NULL
					AND v.datacriacao >= ${dataInicioStr}::date
					AND v.datacriacao < (${dataFimStr}::date + interval '1 day')
				GROUP BY v.identidade, e.nome
				ORDER BY total DESC
				LIMIT 10
			`),
			db.execute(sql`
				WITH historico AS (
					SELECT DISTINCT identidade
					FROM vendapdvgourmet
					WHERE idempresa = ${idempresa}
						AND identidade IS NOT NULL
						AND datacriacao < ${dataInicioStr}::date
				)
				SELECT
					v.identidade,
					COALESCE(e.nome, 'Cliente sem nome') as nome,
					COALESCE(SUM(v.valortotal::numeric), 0) as total,
					COUNT(*)::int as quantidade
				FROM vendapdvgourmet v
				LEFT JOIN entidade e ON e.id = v.identidade
				JOIN historico h ON h.identidade = v.identidade
				WHERE v.idempresa = ${idempresa}
					AND v.identidade IS NOT NULL
					AND v.datacriacao >= ${dataInicioStr}::date
					AND v.datacriacao < (${dataFimStr}::date + interval '1 day')
				GROUP BY v.identidade, e.nome
				ORDER BY total DESC
				LIMIT 10
			`),
		]);

	const mapClientes = (
		rows: {
			identidade: string;
			nome: string;
			total: string | number;
			quantidade: number;
		}[],
	): TopClienteAnalytics[] =>
		rows.map((row) => ({
			identidade: row.identidade,
			nome: row.nome,
			total: toNumber(row.total),
			quantidade: row.quantidade,
		}));

	return {
		clientesAtendidos: metricas.clientesAtendidos,
		clientesNovos: segmentos.clientesNovos,
		clientesRecorrentes: segmentos.clientesRecorrentes,
		ticketMedio: metricas.ticketMedio,
		faturamento: metricas.faturamento,
		topClientes,
		novos: mapClientes(
			rowsOf<{
				identidade: string;
				nome: string;
				total: string | number;
				quantidade: number;
			}>(novosResult),
		),
		recorrentes: mapClientes(
			rowsOf<{
				identidade: string;
				nome: string;
				total: string | number;
				quantidade: number;
			}>(recorrentesResult),
		),
	};
}

export async function buscarClientesRfm({
	idempresa,
	dataInicioStr,
	dataFimStr,
}: ParametrosPeriodo): Promise<ClientesRfmResposta> {
	const result = await db.execute(sql`
		SELECT
			v.identidade,
			COALESCE(e.nome, 'Cliente sem nome') as nome,
			(CURRENT_DATE - MAX(DATE(v.datacriacao)))::int as recencia_dias,
			COUNT(*)::int as frequencia,
			COALESCE(SUM(v.valortotal::numeric), 0) as monetario
		FROM vendapdvgourmet v
		LEFT JOIN entidade e ON e.id = v.identidade
		WHERE v.idempresa = ${idempresa}
			AND v.identidade IS NOT NULL
			AND v.datacriacao >= ${dataInicioStr}::date
			AND v.datacriacao < (${dataFimStr}::date + interval '1 day')
		GROUP BY v.identidade, e.nome
	`);

	const base = rowsOf<{
		identidade: string;
		nome: string;
		recencia_dias: number;
		frequencia: number;
		monetario: string | number;
	}>(result).map((row) => ({
		identidade: row.identidade,
		nome: row.nome,
		recenciaDias: row.recencia_dias,
		frequencia: row.frequencia,
		monetario: toNumber(row.monetario),
	}));

	const medFreq = mediana(base.map((c) => c.frequencia));
	const medMon = mediana(base.map((c) => c.monetario));

	const clientes: ClienteRfmItem[] = base.map((c) => {
		let segmento: SegmentoRfm;
		if (c.recenciaDias <= 30 && c.frequencia >= medFreq && c.monetario >= medMon) {
			segmento = "vip";
		} else if (c.recenciaDias <= 60 && c.frequencia >= medFreq) {
			segmento = "fieis";
		} else if (c.recenciaDias > 90) {
			segmento = "inativos";
		} else if (c.recenciaDias > 60 && c.frequencia < medFreq) {
			segmento = "risco";
		} else if (c.frequencia <= 2 && c.recenciaDias <= 45) {
			segmento = "novos";
		} else {
			segmento = "fieis";
		}

		return { ...c, segmento };
	});

	const segmentos: Record<SegmentoRfm, number> = {
		vip: 0,
		fieis: 0,
		risco: 0,
		inativos: 0,
		novos: 0,
	};

	for (const cliente of clientes) {
		segmentos[cliente.segmento] += 1;
	}

	return { segmentos, clientes };
}

export async function buscarInsights({
	idempresa,
	dataInicioStr,
	dataFimStr,
	periodoAnterior,
}: ParametrosPeriodo & {
	periodoAnterior: { dataInicioStr: string; dataFimStr: string };
}): Promise<InsightItem[]> {
	const [executivo, saude] = await Promise.all([
		buscarExecutivoDashboard({
			idempresa,
			dataInicioStr,
			dataFimStr,
			periodoAnterior,
			periodoYoY: periodoAnterior,
		}),
		buscarFinanceiroSaude({ idempresa, dataInicioStr, dataFimStr }),
	]);

	const insights: InsightItem[] = [];

	if ((executivo.faturamento.variacaoPeriodoAnteriorPct ?? 0) >= 10) {
		insights.push({
			severidade: "positivo",
			mensagem: `Faturamento cresceu ${executivo.faturamento.variacaoPeriodoAnteriorPct?.toFixed(1)}% vs período anterior.`,
			tabAlvo: "executivo",
			codigo: "FATURAMENTO_ALTA",
		});
	} else if ((executivo.faturamento.variacaoPeriodoAnteriorPct ?? 0) <= -10) {
		insights.push({
			severidade: "atencao",
			mensagem: `Faturamento caiu ${Math.abs(executivo.faturamento.variacaoPeriodoAnteriorPct ?? 0).toFixed(1)}% vs período anterior.`,
			tabAlvo: "vendas",
			codigo: "FATURAMENTO_QUEDA",
		});
	}

	if ((executivo.lucroBruto.margemBrutaPct ?? 0) < 20) {
		insights.push({
			severidade: "critico",
			mensagem: `Margem bruta em ${(executivo.lucroBruto.margemBrutaPct ?? 0).toFixed(1)}% — revise custos e precificação.`,
			tabAlvo: "rentabilidade",
			codigo: "MARGEM_BAIXA",
		});
	}

	if (saude.valorVencidoReceber > 0) {
		insights.push({
			severidade: saude.valorVencidoReceber > saude.contasReceberAberto * 0.3
				? "critico"
				: "atencao",
			mensagem: `Há R$ ${saude.valorVencidoReceber.toFixed(2)} em contas a receber vencidas.`,
			tabAlvo: "financeiro",
			codigo: "RECEBER_VENCIDO",
		});
	}

	if (executivo.caixa.saldoProjetado < 0) {
		insights.push({
			severidade: "critico",
			mensagem: "Saldo de caixa projetado para os próximos 30 dias está negativo.",
			tabAlvo: "fluxo-caixa",
			codigo: "CAIXA_NEGATIVO",
		});
	}

	if (
		executivo.vendas.clientesAtendidos > 0 &&
		executivo.financeiro.resultadoOperacional > 0
	) {
		insights.push({
			severidade: "positivo",
			mensagem: "Resultado operacional positivo no período analisado.",
			tabAlvo: "executivo",
			codigo: "RESULTADO_POSITIVO",
		});
	}

	return insights;
}

/** Helpers reutilizados pelo acompanhamento de metas */
export async function calcularRealizadoMeta({
	idempresa,
	tipo,
	dataInicioStr,
	dataFimStr,
}: {
	idempresa: string;
	tipo: string;
	dataInicioStr: string;
	dataFimStr: string;
}): Promise<number> {
	switch (tipo) {
		case "faturamento":
			return somarFaturamento(idempresa, dataInicioStr, dataFimStr);
		case "vendas": {
			const metricas = await metricasVendasPeriodo(
				idempresa,
				dataInicioStr,
				dataFimStr,
			);
			return metricas.quantidade;
		}
		case "lucro": {
			const [fat, cmv] = await Promise.all([
				somarFaturamento(idempresa, dataInicioStr, dataFimStr),
				somarCmv(idempresa, dataInicioStr, dataFimStr),
			]);
			return fat - cmv;
		}
		case "margem": {
			const [fat, cmv] = await Promise.all([
				somarFaturamento(idempresa, dataInicioStr, dataFimStr),
				somarCmv(idempresa, dataInicioStr, dataFimStr),
			]);
			return fat > 0 ? ((fat - cmv) / fat) * 100 : 0;
		}
		case "despesas":
			return somarMovimentacoesPorTipo(
				idempresa,
				["S", "D"],
				dataInicioStr,
				dataFimStr,
			);
		default:
			return 0;
	}
}

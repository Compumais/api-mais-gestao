import { and, desc, eq, sql, sum } from "drizzle-orm";
import * as schema from "../../drizzle/schema.js";
import { db } from "./connection.js";

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

export interface DashboardData {
	totalContasPagar: string;
	totalContasReceber: string;
	saldoBancario: string;
	saldoCaixa: string;
	quantidadeUsuarios: number;
}

export interface HistoricoFinanceiroItem {
	date: string;
	contasPagar: number;
	contasReceber: number;
}

export interface UltimaMovimentacao {
	id: string;
	descricao: string;
	valor: string;
	data: string;
	status: string;
	usuario: string;
	tipo: "P" | "R" | "B";
	natureza: "entrada" | "saida";
}

export interface UltimasMovimentacoes {
	pagar: UltimaMovimentacao[];
	receber: UltimaMovimentacao[];
	bancarias: UltimaMovimentacao[];
}

export interface TopPorCategoriaItem {
	idplanocontas: string;
	codigo: string | null;
	nome: string | null;
	total: number;
}

export interface TopPorCategoriaResposta {
	itens: TopPorCategoriaItem[];
	total: number;
}

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

const formatarStatusFinanceiro = (status: string | null): string => {
	if (!status) return "Pendente";

	const statusMap: Record<string, string> = {
		A: "Aberto",
		Q: "Quitado",
		P: "Parcial",
		C: "Cancelado",
	};

	return statusMap[status] || status;
};

async function somarFinanceiroPorTipo(idempresa: string, tipo: "P" | "R") {
	const [result] = await db
		.select({ total: sum(schema.financeiro.saldo) })
		.from(schema.financeiro)
		.where(
			and(
				eq(schema.financeiro.idempresa, idempresa),
				eq(schema.financeiro.tipo, tipo),
				eq(schema.financeiro.status, "A"),
			),
		);

	return result?.total || "0.00";
}

async function buscarUltimosSaldos(ids: string[]) {
	if (!ids.length) return "0.00";

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

	return saldos.reduce((acc, saldo) => acc + saldo, 0).toFixed(2);
}

/* -------------------------------------------------------------------------- */
/*                              DASHBOARD DATA                                */
/* -------------------------------------------------------------------------- */

export async function buscarDadosDashboard({
	idempresa,
}: {
	idempresa: string;
}): Promise<DashboardData> {
	const totalContasPagar = await somarFinanceiroPorTipo(idempresa, "P");
	const totalContasReceber = await somarFinanceiroPorTipo(idempresa, "R");

	const contasCorrentes = await db
		.select({
			id: schema.contacorrente.id,
			caixa: schema.contacorrente.caixa,
		})
		.from(schema.contacorrente)
		.where(eq(schema.contacorrente.idempresa, idempresa));

	const contasBancariasIds = contasCorrentes
		.filter((cc) => cc.caixa !== 1)
		.map((cc) => cc.id);

	const contasCaixaIds = contasCorrentes
		.filter((cc) => cc.caixa === 1)
		.map((cc) => cc.id);

	const saldoBancario = await buscarUltimosSaldos(contasBancariasIds);
	const saldoCaixa = await buscarUltimosSaldos(contasCaixaIds);

	const [usuariosCount] = await db
		.select({ value: sql<number>`COUNT(*)::int` })
		.from(schema.usuarioEmpresa)
		.where(eq(schema.usuarioEmpresa.idempresa, idempresa));

	return {
		totalContasPagar,
		totalContasReceber,
		saldoBancario,
		saldoCaixa,
		quantidadeUsuarios: usuariosCount?.value || 0,
	};
}

/* -------------------------------------------------------------------------- */
/*                           HISTÃ“RICO FINANCEIRO                             */
/* -------------------------------------------------------------------------- */

export async function buscarHistoricoFinanceiro({
	idempresa,
	dias,
}: {
	idempresa: string;
	dias: number;
}): Promise<HistoricoFinanceiroItem[]> {
	const dataInicio = new Date();
	dataInicio.setDate(dataInicio.getDate() - dias);

	const dataInicioStr = toDateString(dataInicio);

	const [pagar, receber] = await Promise.all([
		buscarHistoricoPorTipo(idempresa, "P", dataInicioStr),
		buscarHistoricoPorTipo(idempresa, "R", dataInicioStr),
	]);

	const mapaDados = new Map<
		string,
		{ contasPagar: number; contasReceber: number }
	>();

	const processarDados = (
		rows: any[],
		campo: "contasPagar" | "contasReceber",
	) => {
		for (const row of rows) {
			const dateStr = toDateString(row.date);
			if (!dateStr) continue;

			if (!mapaDados.has(dateStr)) {
				mapaDados.set(dateStr, { contasPagar: 0, contasReceber: 0 });
			}

			mapaDados.get(dateStr)![campo] = toNumber(row.total);
		}
	};

	processarDados(pagar.rows, "contasPagar");
	processarDados(receber.rows, "contasReceber");

	const resultado: HistoricoFinanceiroItem[] = [];
	const hoje = new Date();
	hoje.setHours(0, 0, 0, 0);

	for (let i = dias - 1; i >= 0; i--) {
		const data = new Date(hoje);
		data.setDate(data.getDate() - i);

		const dateStr = toDateString(data);
		const dados = mapaDados.get(dateStr) || {
			contasPagar: 0,
			contasReceber: 0,
		};

		resultado.push({
			date: dateStr,
			contasPagar: dados.contasPagar,
			contasReceber: dados.contasReceber,
		});
	}

	return resultado;
}

async function buscarHistoricoPorTipo(
	idempresa: string,
	tipo: "P" | "R",
	dataInicio: string,
) {
	return db.execute(sql`
        SELECT 
            vencimento as date,
            COALESCE(SUM(saldo::numeric), 0) as total
        FROM financeiro
        WHERE 
            idempresa = ${idempresa}
            AND tipo = ${tipo}
            AND status = 'A'
            AND vencimento IS NOT NULL
            AND vencimento >= ${dataInicio}::date
        GROUP BY vencimento
    `);
}

/* -------------------------------------------------------------------------- */
/*                           ÃšLTIMAS MOVIMENTAÃ‡Ã•ES                            */
/* -------------------------------------------------------------------------- */

export async function buscarUltimasMovimentacoes({
	idempresa,
}: {
	idempresa: string;
}): Promise<UltimasMovimentacoes> {
	const [pagar, receber, bancarias] = await Promise.all([
		buscarMovimentacoesFinanceiras(idempresa, "P"),
		buscarMovimentacoesFinanceiras(idempresa, "R"),
		buscarMovimentacoesBancarias(idempresa),
	]);

	return {
		pagar: mapearMovimentacoesFinanceiras(pagar, "P"),
		receber: mapearMovimentacoesFinanceiras(receber, "R"),
		bancarias: mapearMovimentacoesBancarias(bancarias),
	};
}

async function buscarMovimentacoesFinanceiras(
	idempresa: string,
	tipo: "P" | "R",
) {
	return db
		.select({
			id: schema.financeiro.id,
			descricao: schema.entidade.nome,
			valor: schema.financeiro.valor,
			data: schema.financeiro.vencimento,
			status: schema.financeiro.status,
			usuario: sql<string>`COALESCE(
                (SELECT usuario 
                 FROM financeirolancamento 
                 WHERE idfinanceiro = financeiro.id 
                 ORDER BY evento ASC 
                 LIMIT 1),
                'Sistema'
            )`,
			documento: schema.financeiro.documento,
		})
		.from(schema.financeiro)
		.leftJoin(
			schema.entidade,
			eq(schema.financeiro.identidade, schema.entidade.id),
		)
		.where(
			and(
				eq(schema.financeiro.idempresa, idempresa),
				eq(schema.financeiro.tipo, tipo),
			),
		)
		.orderBy(desc(schema.financeiro.registro))
		.limit(5);
}

async function buscarMovimentacoesBancarias(idempresa: string) {
	return db
		.select({
			id: schema.contacorrentelancamento.id,
			descricao: schema.contacorrentelancamento.historico,
			valor: schema.contacorrentelancamento.valor,
			data: schema.contacorrentelancamento.datahora,
			status: sql<string>`'Conciliado'`,
			usuario: schema.usuarios.nome,
			tipo: schema.contacorrentelancamento.tipo,
		})
		.from(schema.contacorrentelancamento)
		.leftJoin(
			schema.contacorrente,
			eq(
				schema.contacorrentelancamento.idcontacorrente,
				schema.contacorrente.id,
			),
		)
		.leftJoin(
			schema.usuarios,
			eq(schema.contacorrentelancamento.idusuario, schema.usuarios.id),
		)
		.where(eq(schema.contacorrente.idempresa, idempresa))
		.orderBy(
			desc(schema.contacorrentelancamento.datahora),
			desc(schema.contacorrentelancamento.currenttimemillis),
		)
		.limit(5);
}

function mapearMovimentacoesFinanceiras(
	movimentacoes: any[],
	tipo: "P" | "R",
): UltimaMovimentacao[] {
	return movimentacoes.map((m) => ({
		id: m.id,
		descricao: m.descricao || m.documento || "Sem descriÃ§Ã£o",
		valor: m.valor || "0.00",
		data: toDateString(m.data),
		status: formatarStatusFinanceiro(m.status),
		usuario: m.usuario || "Sistema",
		tipo,
		natureza: tipo === "P" ? "saida" : "entrada",
	}));
}

function mapearMovimentacoesBancarias(
	movimentacoes: any[],
): UltimaMovimentacao[] {
	return movimentacoes.map((m) => ({
		id: m.id,
		descricao: m.descricao || "Sem descriÃ§Ã£o",
		valor: m.valor || "0.00",
		data: toDateString(m.data),
		status: m.status,
		usuario: m.usuario || "Sistema",
		tipo: "B",
		natureza: m.tipo === "E" ? "entrada" : "saida",
	}));
}

/* -------------------------------------------------------------------------- */
/*                     TOP DESPESAS/RECEITAS POR CATEGORIA                    */
/* -------------------------------------------------------------------------- */

export async function buscarTopDespesasPorCategoria({
	idempresa,
	dias,
}: {
	idempresa: string;
	dias: number;
}): Promise<TopPorCategoriaResposta> {
	const dataInicio = new Date();
	dataInicio.setDate(dataInicio.getDate() - dias);
	const dataInicioStr = toDateString(dataInicio);
	const dataFimStr = toDateString(new Date());

	const result = await db.execute(sql`
		SELECT 
			ccl.idplanocontas,
			pc.codigo,
			pc.nome,
			SUM(ccl.valor::numeric) as total
		FROM contacorrentelancamento ccl
		JOIN contacorrente cc ON cc.id = ccl.idcontacorrente
		LEFT JOIN planocontas pc ON pc.id = ccl.idplanocontas
		WHERE cc.idempresa = ${idempresa}
			AND TRIM(ccl.tipo) IN ('S', 'D')
			AND ccl.idplanocontas IS NOT NULL
			AND ccl.datahora >= ${dataInicioStr}::date
			AND ccl.datahora <= ${dataFimStr}::date
		GROUP BY ccl.idplanocontas, pc.codigo, pc.nome
		ORDER BY total DESC
		LIMIT 5
	`);

	const rows = (result.rows || result) as {
		idplanocontas: string;
		codigo: string | null;
		nome: string | null;
		total: string | number;
	}[];

	const itens: TopPorCategoriaItem[] = rows.map((row) => ({
		idplanocontas: row.idplanocontas,
		codigo: row.codigo,
		nome: row.nome,
		total: toNumber(row.total),
	}));

	const total = itens.reduce((acc, item) => acc + item.total, 0);

	return { itens, total };
}

export async function buscarTopReceitasPorCategoria({
	idempresa,
	dias,
}: {
	idempresa: string;
	dias: number;
}): Promise<TopPorCategoriaResposta> {
	const dataInicio = new Date();
	dataInicio.setDate(dataInicio.getDate() - dias);
	const dataInicioStr = toDateString(dataInicio);
	const dataFimStr = toDateString(new Date());

	const result = await db.execute(sql`
		SELECT 
			ccl.idplanocontas,
			pc.codigo,
			pc.nome,
			SUM(ccl.valor::numeric) as total
		FROM contacorrentelancamento ccl
		JOIN contacorrente cc ON cc.id = ccl.idcontacorrente
		LEFT JOIN planocontas pc ON pc.id = ccl.idplanocontas
		WHERE cc.idempresa = ${idempresa}
			AND TRIM(ccl.tipo) IN ('E', 'C')
			AND ccl.idplanocontas IS NOT NULL
			AND ccl.datahora >= ${dataInicioStr}::date
			AND ccl.datahora <= ${dataFimStr}::date
		GROUP BY ccl.idplanocontas, pc.codigo, pc.nome
		ORDER BY total DESC
		LIMIT 5
	`);

	const rows = (result.rows || result) as {
		idplanocontas: string;
		codigo: string | null;
		nome: string | null;
		total: string | number;
	}[];

	const itens: TopPorCategoriaItem[] = rows.map((row) => ({
		idplanocontas: row.idplanocontas,
		codigo: row.codigo,
		nome: row.nome,
		total: toNumber(row.total),
	}));

	const total = itens.reduce((acc, item) => acc + item.total, 0);

	return { itens, total };
}

/* -------------------------------------------------------------------------- */
/*                         DASHBOARD EXPANDIDO                                */
/* -------------------------------------------------------------------------- */

export interface FinanceiroResumo {
	totalReceitas: number;
	totalDespesas: number;
	saldo: number;
	totalLancamentos: number;
}

export interface EvolucaoMensalItem {
	mes: number;
	receitas: number;
	despesas: number;
	saldo: number;
}

export interface TopDespesaItem {
	id: string;
	descricao: string;
	valor: number;
	data: string;
	planoContas: string | null;
}

export interface DadosVendasResumo {
	totalVendas: number;
	quantidadeVendas: number;
	quantidadeFechamentos: number;
	diferencaFechamentos: number;
}

export interface HistoricoVendasItem {
	date: string;
	total: number;
	quantidade: number;
}

export interface TopProdutoItem {
	idproduto: string;
	nome: string;
	quantidade: number;
	total: number;
}

export interface FechamentoCaixaItem {
	id: number;
	datahora: string | null;
	pdv: number | null;
	saldoinformado: string | null;
	saldoapurado: string | null;
	sobra: string | null;
	falta: string | null;
	diferenca: number;
}

export interface PlanoContasMensalItem {
	idplanocontas: string;
	codigo: string | null;
	nome: string | null;
	tipoconta: number | null;
	meses: number[];
	total: number;
}

export interface ControlePlanoContasResposta {
	ano: number;
	linhas: PlanoContasMensalItem[];
	saldoLiquidoMensal: number[];
}

export interface DreLinhaItem {
	id: string;
	nome: string;
	tipo: "receita" | "despesa" | "resultado";
	nivel: number;
	meses: number[];
	total: number;
}

export interface DreResposta {
	ano: number;
	linhas: DreLinhaItem[];
}

export interface ComparativoMensalItem {
	mes: number;
	receitaAnoAnterior: number;
	despesaAnoAnterior: number;
	receitaAnoAtual: number;
	despesaAnoAtual: number;
	saldoAnoAnterior: number;
	saldoAnoAtual: number;
	saldoAcumuladoAnoAnterior: number;
	saldoAcumuladoAnoAtual: number;
	variacaoReceitaPercentual: number;
}

export interface ComparativoResposta {
	anoAtual: number;
	anoAnterior: number;
	totais: {
		receitaAnoAnterior: number;
		despesaAnoAnterior: number;
		receitaAnoAtual: number;
		despesaAnoAtual: number;
	};
	meses: ComparativoMensalItem[];
}

const MESES_VAZIOS = () => Array.from({ length: 12 }, () => 0);

function obterIntervaloDias(dias: number) {
	const dataFim = new Date();
	const dataInicio = new Date();
	dataInicio.setDate(dataInicio.getDate() - dias);
	return {
		dataInicioStr: toDateString(dataInicio),
		dataFimStr: toDateString(dataFim),
	};
}

function obterIntervaloAno(ano: number) {
	return {
		dataInicioStr: `${ano}-01-01`,
		dataFimStr: `${ano}-12-31`,
	};
}

async function somarMovimentacoesPorTipo(
	idempresa: string,
	tipos: string[],
	dataInicioStr: string,
	dataFimStr: string,
) {
	const result = await db.execute(sql`
		SELECT COALESCE(SUM(ccl.valor::numeric), 0) as total
		FROM contacorrentelancamento ccl
		JOIN contacorrente cc ON cc.id = ccl.idcontacorrente
		WHERE cc.idempresa = ${idempresa}
			AND TRIM(ccl.tipo) IN (${sql.join(tipos.map((t) => sql`${t}`), sql`, `)})
			AND ccl.datahora >= ${dataInicioStr}::date
			AND ccl.datahora <= ${dataFimStr}::date
	`);
	const rows = (result.rows || result) as { total: string | number }[];
	return toNumber(rows[0]?.total);
}

export async function buscarFinanceiroResumo({
	idempresa,
	dias = 90,
}: {
	idempresa: string;
	dias?: number;
}): Promise<FinanceiroResumo> {
	const { dataInicioStr, dataFimStr } = obterIntervaloDias(dias);

	const [totalReceitas, totalDespesas, lancamentosFinanceiro, lancamentosBancarios] =
		await Promise.all([
			somarMovimentacoesPorTipo(idempresa, ["E", "C"], dataInicioStr, dataFimStr),
			somarMovimentacoesPorTipo(idempresa, ["S", "D"], dataInicioStr, dataFimStr),
			db.execute(sql`
				SELECT COUNT(*)::int as total
				FROM financeiro
				WHERE idempresa = ${idempresa}
					AND registro >= ${dataInicioStr}::date
					AND registro <= ${dataFimStr}::date
			`),
			db.execute(sql`
				SELECT COUNT(*)::int as total
				FROM contacorrentelancamento ccl
				JOIN contacorrente cc ON cc.id = ccl.idcontacorrente
				WHERE cc.idempresa = ${idempresa}
					AND ccl.datahora >= ${dataInicioStr}::date
					AND ccl.datahora <= ${dataFimStr}::date
			`),
		]);

	const countFin = (lancamentosFinanceiro.rows || lancamentosFinanceiro) as {
		total: number;
	}[];
	const countBanc = (lancamentosBancarios.rows || lancamentosBancarios) as {
		total: number;
	}[];

	return {
		totalReceitas,
		totalDespesas,
		saldo: totalReceitas - totalDespesas,
		totalLancamentos: (countFin[0]?.total ?? 0) + (countBanc[0]?.total ?? 0),
	};
}

export async function buscarEvolucaoMensal({
	idempresa,
	dias,
	ano,
}: {
	idempresa: string;
	dias?: number;
	ano?: number;
}): Promise<EvolucaoMensalItem[]> {
	const intervalo = ano
		? obterIntervaloAno(ano)
		: obterIntervaloDias(dias ?? 90);

	const [receitasRows, despesasRows] = await Promise.all([
		db.execute(sql`
			SELECT
				EXTRACT(MONTH FROM ccl.datahora)::int as mes,
				COALESCE(SUM(ccl.valor::numeric), 0) as total
			FROM contacorrentelancamento ccl
			JOIN contacorrente cc ON cc.id = ccl.idcontacorrente
			WHERE cc.idempresa = ${idempresa}
				AND TRIM(ccl.tipo) IN ('E', 'C')
				AND ccl.datahora >= ${intervalo.dataInicioStr}::date
				AND ccl.datahora <= ${intervalo.dataFimStr}::date
			GROUP BY EXTRACT(MONTH FROM ccl.datahora)
		`),
		db.execute(sql`
			SELECT
				EXTRACT(MONTH FROM ccl.datahora)::int as mes,
				COALESCE(SUM(ccl.valor::numeric), 0) as total
			FROM contacorrentelancamento ccl
			JOIN contacorrente cc ON cc.id = ccl.idcontacorrente
			WHERE cc.idempresa = ${idempresa}
				AND TRIM(ccl.tipo) IN ('S', 'D')
				AND ccl.datahora >= ${intervalo.dataInicioStr}::date
				AND ccl.datahora <= ${intervalo.dataFimStr}::date
			GROUP BY EXTRACT(MONTH FROM ccl.datahora)
		`),
	]);

	const receitasMap = new Map<number, number>();
	const despesasMap = new Map<number, number>();

	for (const row of (receitasRows.rows || receitasRows) as {
		mes: number;
		total: string | number;
	}[]) {
		receitasMap.set(Number(row.mes), toNumber(row.total));
	}

	for (const row of (despesasRows.rows || despesasRows) as {
		mes: number;
		total: string | number;
	}[]) {
		despesasMap.set(Number(row.mes), toNumber(row.total));
	}

	if (ano) {
		return Array.from({ length: 12 }, (_, index) => {
			const mes = index + 1;
			const receitas = receitasMap.get(mes) ?? 0;
			const despesas = despesasMap.get(mes) ?? 0;
			return { mes, receitas, despesas, saldo: receitas - despesas };
		});
	}

	const meses = new Set([...receitasMap.keys(), ...despesasMap.keys()]);
	return Array.from(meses)
		.sort((a, b) => a - b)
		.map((mes) => {
			const receitas = receitasMap.get(mes) ?? 0;
			const despesas = despesasMap.get(mes) ?? 0;
			return { mes, receitas, despesas, saldo: receitas - despesas };
		});
}

export async function buscarTopDespesasValor({
	idempresa,
	dias = 90,
	limit = 10,
}: {
	idempresa: string;
	dias?: number;
	limit?: number;
}): Promise<TopDespesaItem[]> {
	const { dataInicioStr, dataFimStr } = obterIntervaloDias(dias);

	const result = await db.execute(sql`
		SELECT
			ccl.id,
			COALESCE(ccl.historico, pc.nome, 'Sem descriÃ§Ã£o') as descricao,
			ccl.valor::numeric as valor,
			ccl.datahora as data,
			pc.nome as plano_contas
		FROM contacorrentelancamento ccl
		JOIN contacorrente cc ON cc.id = ccl.idcontacorrente
		LEFT JOIN planocontas pc ON pc.id = ccl.idplanocontas
		WHERE cc.idempresa = ${idempresa}
			AND TRIM(ccl.tipo) IN ('S', 'D')
			AND ccl.datahora >= ${dataInicioStr}::date
			AND ccl.datahora <= ${dataFimStr}::date
		ORDER BY ccl.valor::numeric DESC
		LIMIT ${limit}
	`);

	const rows = (result.rows || result) as {
		id: string;
		descricao: string;
		valor: string | number;
		data: string;
		plano_contas: string | null;
	}[];

	return rows.map((row) => ({
		id: row.id,
		descricao: row.descricao,
		valor: toNumber(row.valor),
		data: toDateString(row.data),
		planoContas: row.plano_contas,
	}));
}

export async function buscarDadosVendas({
	idempresa,
	dias = 90,
}: {
	idempresa: string;
	dias?: number;
}): Promise<DadosVendasResumo> {
	const { dataInicioStr, dataFimStr } = obterIntervaloDias(dias);

	const [vendasResult, fechamentosResult] = await Promise.all([
		db.execute(sql`
			SELECT
				COALESCE(SUM(valortotal::numeric), 0) as total,
				COUNT(*)::int as quantidade
			FROM vendapdvgourmet
			WHERE idempresa = ${idempresa}
				AND datacriacao >= ${dataInicioStr}::date
				AND datacriacao <= ${dataFimStr}::date + interval '1 day'
		`),
		db.execute(sql`
			SELECT
				COUNT(*)::int as quantidade,
				COALESCE(SUM(COALESCE(sobra::numeric, 0) - COALESCE(falta::numeric, 0)), 0) as diferenca
			FROM fechamentopdv
			WHERE idempresa = ${idempresa}
				AND datahora >= ${dataInicioStr}::timestamp
				AND datahora <= ${dataFimStr}::timestamp + interval '1 day'
		`),
	]);

	const vendas = (vendasResult.rows || vendasResult)[0] as {
		total: string | number;
		quantidade: number;
	};
	const fechamentos = (fechamentosResult.rows || fechamentosResult)[0] as {
		quantidade: number;
		diferenca: string | number;
	};

	return {
		totalVendas: toNumber(vendas?.total),
		quantidadeVendas: vendas?.quantidade ?? 0,
		quantidadeFechamentos: fechamentos?.quantidade ?? 0,
		diferencaFechamentos: toNumber(fechamentos?.diferenca),
	};
}

export async function buscarHistoricoVendas({
	idempresa,
	dias = 90,
}: {
	idempresa: string;
	dias?: number;
}): Promise<HistoricoVendasItem[]> {
	const { dataInicioStr, dataFimStr } = obterIntervaloDias(dias);

	const result = await db.execute(sql`
		SELECT
			DATE(datacriacao) as date,
			COALESCE(SUM(valortotal::numeric), 0) as total,
			COUNT(*)::int as quantidade
		FROM vendapdvgourmet
		WHERE idempresa = ${idempresa}
			AND datacriacao >= ${dataInicioStr}::date
			AND datacriacao <= ${dataFimStr}::date + interval '1 day'
		GROUP BY DATE(datacriacao)
		ORDER BY DATE(datacriacao)
	`);

	const rows = (result.rows || result) as {
		date: string;
		total: string | number;
		quantidade: number;
	}[];

	const mapa = new Map<string, HistoricoVendasItem>();
	for (const row of rows) {
		const dateStr = toDateString(row.date);
		mapa.set(dateStr, {
			date: dateStr,
			total: toNumber(row.total),
			quantidade: row.quantidade,
		});
	}

	const resultado: HistoricoVendasItem[] = [];
	const hoje = new Date();
	hoje.setHours(0, 0, 0, 0);

	for (let i = dias - 1; i >= 0; i--) {
		const data = new Date(hoje);
		data.setDate(data.getDate() - i);
		const dateStr = toDateString(data);
		resultado.push(
			mapa.get(dateStr) ?? { date: dateStr, total: 0, quantidade: 0 },
		);
	}

	return resultado;
}

export async function buscarTopProdutos({
	idempresa,
	dias = 90,
	limit = 5,
}: {
	idempresa: string;
	dias?: number;
	limit?: number;
}): Promise<TopProdutoItem[]> {
	const { dataInicioStr, dataFimStr } = obterIntervaloDias(dias);

	const result = await db.execute(sql`
		SELECT
			vi.idproduto,
			p.nome,
			COALESCE(SUM(vi.quantidade::numeric), 0) as quantidade,
			COALESCE(SUM(vi.precototal::numeric), 0) as total
		FROM vendapdvitem vi
		JOIN vendapdvgourmet v ON v.id = vi.idvenda
		JOIN produtos p ON p.id = vi.idproduto
		WHERE vi.idempresa = ${idempresa}
			AND v.datacriacao >= ${dataInicioStr}::date
			AND v.datacriacao <= ${dataFimStr}::date + interval '1 day'
		GROUP BY vi.idproduto, p.nome
		ORDER BY total DESC
		LIMIT ${limit}
	`);

	const rows = (result.rows || result) as {
		idproduto: string;
		nome: string;
		quantidade: string | number;
		total: string | number;
	}[];

	return rows.map((row) => ({
		idproduto: row.idproduto,
		nome: row.nome,
		quantidade: toNumber(row.quantidade),
		total: toNumber(row.total),
	}));
}

export async function buscarUltimosFechamentos({
	idempresa,
	limit = 5,
}: {
	idempresa: string;
	limit?: number;
}): Promise<FechamentoCaixaItem[]> {
	const result = await db.execute(sql`
		SELECT
			id,
			datahora,
			pdv,
			saldoinformado,
			saldoapurado,
			sobra,
			falta
		FROM fechamentopdv
		WHERE idempresa = ${idempresa}
		ORDER BY datahora DESC NULLS LAST, id DESC
		LIMIT ${limit}
	`);

	const rows = (result.rows || result) as {
		id: number;
		datahora: string | null;
		pdv: number | null;
		saldoinformado: string | null;
		saldoapurado: string | null;
		sobra: string | null;
		falta: string | null;
	}[];

	return rows.map((row) => ({
		id: row.id,
		datahora: row.datahora,
		pdv: row.pdv,
		saldoinformado: row.saldoinformado,
		saldoapurado: row.saldoapurado,
		sobra: row.sobra,
		falta: row.falta,
		diferenca: toNumber(row.sobra) - toNumber(row.falta),
	}));
}

async function buscarMovimentacoesPlanoContasPorMes(
	idempresa: string,
	ano: number,
	tipos: string[],
) {
	const { dataInicioStr, dataFimStr } = obterIntervaloAno(ano);

	const result = await db.execute(sql`
		SELECT
			ccl.idplanocontas,
			pc.codigo,
			pc.nome,
			pc.tipoconta,
			EXTRACT(MONTH FROM ccl.datahora)::int as mes,
			COALESCE(SUM(ccl.valor::numeric), 0) as total
		FROM contacorrentelancamento ccl
		JOIN contacorrente cc ON cc.id = ccl.idcontacorrente
		LEFT JOIN planocontas pc ON pc.id = ccl.idplanocontas
		WHERE cc.idempresa = ${idempresa}
			AND TRIM(ccl.tipo) IN (${sql.join(tipos.map((t) => sql`${t}`), sql`, `)})
			AND ccl.idplanocontas IS NOT NULL
			AND ccl.datahora >= ${dataInicioStr}::date
			AND ccl.datahora <= ${dataFimStr}::date
		GROUP BY ccl.idplanocontas, pc.codigo, pc.nome, pc.tipoconta, EXTRACT(MONTH FROM ccl.datahora)
		ORDER BY pc.codigo, mes
	`);

	return (result.rows || result) as {
		idplanocontas: string;
		codigo: string | null;
		nome: string | null;
		tipoconta: number | null;
		mes: number;
		total: string | number;
	}[];
}

function agruparPlanoContasMensal(
	rows: {
		idplanocontas: string;
		codigo: string | null;
		nome: string | null;
		tipoconta: number | null;
		mes: number;
		total: string | number;
	}[],
): PlanoContasMensalItem[] {
	const mapa = new Map<string, PlanoContasMensalItem>();

	for (const row of rows) {
		if (!mapa.has(row.idplanocontas)) {
			mapa.set(row.idplanocontas, {
				idplanocontas: row.idplanocontas,
				codigo: row.codigo,
				nome: row.nome,
				tipoconta: row.tipoconta,
				meses: MESES_VAZIOS(),
				total: 0,
			});
		}

		const item = mapa.get(row.idplanocontas)!;
		const valor = toNumber(row.total);
		const mesIndex = Number(row.mes) - 1;
		if (mesIndex >= 0 && mesIndex < 12) {
			item.meses[mesIndex] = valor;
			item.total += valor;
		}
	}

	return Array.from(mapa.values()).sort((a, b) =>
		(a.codigo ?? "").localeCompare(b.codigo ?? ""),
	);
}

export async function buscarControlePlanoContas({
	idempresa,
	ano = new Date().getFullYear(),
}: {
	idempresa: string;
	ano?: number;
}): Promise<ControlePlanoContasResposta> {
	const [receitasRows, despesasRows] = await Promise.all([
		buscarMovimentacoesPlanoContasPorMes(idempresa, ano, ["E", "C"]),
		buscarMovimentacoesPlanoContasPorMes(idempresa, ano, ["S", "D"]),
	]);

	const linhasDespesas = agruparPlanoContasMensal(despesasRows);
	const receitasPorMes = MESES_VAZIOS();
	const despesasPorMes = MESES_VAZIOS();

	for (const row of receitasRows) {
		const mesIndex = Number(row.mes) - 1;
		if (mesIndex >= 0 && mesIndex < 12) {
			receitasPorMes[mesIndex] =
				(receitasPorMes[mesIndex] ?? 0) + toNumber(row.total);
		}
	}

	for (const linha of linhasDespesas) {
		for (let i = 0; i < 12; i++) {
			despesasPorMes[i] = (despesasPorMes[i] ?? 0) + (linha.meses[i] ?? 0);
		}
	}

	const saldoLiquidoMensal = receitasPorMes.map(
		(receita, index) => receita - (despesasPorMes[index] ?? 0),
	);

	return {
		ano,
		linhas: linhasDespesas,
		saldoLiquidoMensal,
	};
}

export async function buscarDre({
	idempresa,
	ano = new Date().getFullYear(),
}: {
	idempresa: string;
	ano?: number;
}): Promise<DreResposta> {
	const [receitasRows, despesasRows] = await Promise.all([
		buscarMovimentacoesPlanoContasPorMes(idempresa, ano, ["E", "C"]),
		buscarMovimentacoesPlanoContasPorMes(idempresa, ano, ["S", "D"]),
	]);

	const receitas = agruparPlanoContasMensal(receitasRows);
	const despesas = agruparPlanoContasMensal(despesasRows);

	const totalReceitasMeses = MESES_VAZIOS();
	const totalDespesasMeses = MESES_VAZIOS();

	for (const linha of receitas) {
		for (let i = 0; i < 12; i++) {
			totalReceitasMeses[i] =
				(totalReceitasMeses[i] ?? 0) + (linha.meses[i] ?? 0);
		}
	}

	for (const linha of despesas) {
		for (let i = 0; i < 12; i++) {
			totalDespesasMeses[i] =
				(totalDespesasMeses[i] ?? 0) + (linha.meses[i] ?? 0);
		}
	}

	const resultadoMeses = totalReceitasMeses.map(
		(receita, index) => receita - (totalDespesasMeses[index] ?? 0),
	);

	const linhas: DreLinhaItem[] = [
		{
			id: "receita-total",
			nome: "RECEITA TOTAL",
			tipo: "receita",
			nivel: 0,
			meses: totalReceitasMeses,
			total: totalReceitasMeses.reduce((acc, valor) => acc + valor, 0),
		},
		...receitas.map((linha) => ({
			id: linha.idplanocontas,
			nome: linha.nome ?? "Sem nome",
			tipo: "receita" as const,
			nivel: 1,
			meses: linha.meses,
			total: linha.total,
		})),
		{
			id: "despesa-total",
			nome: "DESPESA TOTAL",
			tipo: "despesa",
			nivel: 0,
			meses: totalDespesasMeses,
			total: totalDespesasMeses.reduce((acc, valor) => acc + valor, 0),
		},
		...despesas.map((linha) => ({
			id: linha.idplanocontas,
			nome: linha.nome ?? "Sem nome",
			tipo: "despesa" as const,
			nivel: 1,
			meses: linha.meses,
			total: linha.total,
		})),
		{
			id: "resultado-liquido",
			nome: "LUCRO OU PREJUÍZO LÍQUIDO",
			tipo: "resultado",
			nivel: 0,
			meses: resultadoMeses,
			total: resultadoMeses.reduce((acc, valor) => acc + valor, 0),
		},
	];

	return { ano, linhas };
}

export async function buscarComparativo({
	idempresa,
	ano = new Date().getFullYear(),
}: {
	idempresa: string;
	ano?: number;
}): Promise<ComparativoResposta> {
	const anoAnterior = ano - 1;
	const [evolucaoAtual, evolucaoAnterior] = await Promise.all([
		buscarEvolucaoMensal({ idempresa, ano }),
		buscarEvolucaoMensal({ idempresa, ano: anoAnterior }),
	]);

	let saldoAcumuladoAnoAnterior = 0;
	let saldoAcumuladoAnoAtual = 0;

	const meses: ComparativoMensalItem[] = Array.from({ length: 12 }, (_, index) => {
		const mes = index + 1;
		const atual = evolucaoAtual.find((item) => item.mes === mes) ?? {
			mes,
			receitas: 0,
			despesas: 0,
			saldo: 0,
		};
		const anterior = evolucaoAnterior.find((item) => item.mes === mes) ?? {
			mes,
			receitas: 0,
			despesas: 0,
			saldo: 0,
		};

		saldoAcumuladoAnoAnterior += anterior.saldo;
		saldoAcumuladoAnoAtual += atual.saldo;

		const variacaoReceitaPercentual =
			anterior.receitas > 0
				? ((atual.receitas - anterior.receitas) / anterior.receitas) * 100
				: atual.receitas > 0
					? 100
					: 0;

		return {
			mes,
			receitaAnoAnterior: anterior.receitas,
			despesaAnoAnterior: anterior.despesas,
			receitaAnoAtual: atual.receitas,
			despesaAnoAtual: atual.despesas,
			saldoAnoAnterior: anterior.saldo,
			saldoAnoAtual: atual.saldo,
			saldoAcumuladoAnoAnterior,
			saldoAcumuladoAnoAtual,
			variacaoReceitaPercentual,
		};
	});

	return {
		anoAtual: ano,
		anoAnterior,
		totais: {
			receitaAnoAnterior: meses.reduce(
				(acc, item) => acc + item.receitaAnoAnterior,
				0,
			),
			despesaAnoAnterior: meses.reduce(
				(acc, item) => acc + item.despesaAnoAnterior,
				0,
			),
			receitaAnoAtual: meses.reduce((acc, item) => acc + item.receitaAnoAtual, 0),
			despesaAnoAtual: meses.reduce((acc, item) => acc + item.despesaAnoAtual, 0),
		},
		meses,
	};
}

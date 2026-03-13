import { sql } from "drizzle-orm";
import { db } from "./connection.js";

export interface FluxoCaixaItem {
	data: string; // YYYY-MM-DD
	entradas: number; // Contas a receber (tipo 'R')
	saidas: number; // Contas a pagar (tipo 'P')
	saldo: number; // entradas - saidas
	saldoAcumulado: number; // saldo acumulado até a data
}

export interface BuscarDadosFluxoCaixaParams {
	idempresa: string;
	dataInicio: string; // YYYY-MM-DD
	dataFim: string; // YYYY-MM-DD
}

export async function buscarDadosFluxoCaixa({
	idempresa,
	dataInicio,
	dataFim,
}: BuscarDadosFluxoCaixaParams): Promise<FluxoCaixaItem[]> {
	// Buscar contas a pagar agrupadas por data de vencimento
	const contasPagarPorData = await db.execute(
		sql`
			SELECT 
				vencimento as date,
				COALESCE(SUM(saldo::numeric), 0) as total
			FROM financeiro
			WHERE 
				idempresa = ${idempresa}
				AND tipo = 'P'
				AND status = 'A'
				AND vencimento IS NOT NULL
				AND vencimento >= ${dataInicio}::date
				AND vencimento <= ${dataFim}::date
			GROUP BY vencimento
			ORDER BY vencimento ASC
		`,
	);

	// Buscar contas a receber agrupadas por data de vencimento
	const contasReceberPorData = await db.execute(
		sql`
			SELECT 
				vencimento as date,
				COALESCE(SUM(saldo::numeric), 0) as total
			FROM financeiro
			WHERE 
				idempresa = ${idempresa}
				AND tipo = 'R'
				AND status = 'A'
				AND vencimento IS NOT NULL
				AND vencimento >= ${dataInicio}::date
				AND vencimento <= ${dataFim}::date
			GROUP BY vencimento
			ORDER BY vencimento ASC
		`,
	);

	// Criar um mapa de datas para facilitar a junção
	const mapaDados = new Map<string, { entradas: number; saidas: number }>();

	// Processar contas a pagar (saídas)
	for (const row of contasPagarPorData.rows) {
		const date = row.date as string | Date | null;
		if (date) {
			const dateStr =
				(typeof date === "string"
					? date.split("T")[0]
					: date instanceof Date
						? date.toISOString().split("T")[0]
						: String(date).split("T")[0]) ?? "";

			if (dateStr && !mapaDados.has(dateStr)) {
				mapaDados.set(dateStr, { entradas: 0, saidas: 0 });
			}
			const dados = dateStr ? mapaDados.get(dateStr) : undefined;
			if (dados) {
				const total =
					typeof row.total === "string"
						? parseFloat(row.total) || 0
						: Number(row.total) || 0;
				dados.saidas = total;
			}
		}
	}

	// Processar contas a receber (entradas)
	for (const row of contasReceberPorData.rows) {
		const date = row.date as string | Date | null;
		if (date) {
			const dateStr =
				(typeof date === "string"
					? date.split("T")[0]
					: date instanceof Date
						? date.toISOString().split("T")[0]
						: String(date).split("T")[0]) ?? "";

			if (dateStr && !mapaDados.has(dateStr)) {
				mapaDados.set(dateStr, { entradas: 0, saidas: 0 });
			}
			const dados = dateStr ? mapaDados.get(dateStr) : undefined;
			if (dados) {
				const total =
					typeof row.total === "string"
						? parseFloat(row.total) || 0
						: Number(row.total) || 0;
				dados.entradas = total;
			}
		}
	}

	// Gerar todas as datas do período e calcular saldo acumulado
	const resultado: FluxoCaixaItem[] = [];
	const dataInicioObj = new Date(dataInicio);
	const dataFimObj = new Date(dataFim);
	dataInicioObj.setHours(0, 0, 0, 0);
	dataFimObj.setHours(23, 59, 59, 999);

	let saldoAcumulado = 0;

	// Iterar por todas as datas do período
	for (
		let data = new Date(dataInicioObj);
		data <= dataFimObj;
		data.setDate(data.getDate() + 1)
	) {
		const dateStr = data.toISOString().split("T")[0] ?? "";
		const dados = mapaDados.get(dateStr) ?? { entradas: 0, saidas: 0 };
		const saldo = dados.entradas - dados.saidas;
		saldoAcumulado += saldo;

		resultado.push({
			data: dateStr,
			entradas: dados.entradas,
			saidas: dados.saidas,
			saldo,
			saldoAcumulado,
		});
	}

	return resultado;
}

// --- Contas a Pagar / Contas a Receber (relatórios em lista) ---

export interface ContasPagarItem {
	documento: string | null;
	emissao: string | null;
	vencimento: string | null;
	valor: number;
	saldo: number;
	historico: string | null;
	status: string | null;
	emitente: string | null;
}

export interface ContasReceberItem {
	documento: string | null;
	emissao: string | null;
	vencimento: string | null;
	valor: number;
	saldo: number;
	historico: string | null;
	status: string | null;
	emitente: string | null;
}

export interface BuscarDadosContasParams {
	idempresa: string;
	dataInicio: string; // YYYY-MM-DD
	dataFim: string; // YYYY-MM-DD
}

function parseDateStr(value: string | Date | null): string | null {
	if (value == null) return null;
	if (typeof value === "string") return value.split("T")[0] ?? value;
	if (value instanceof Date) return value.toISOString().split("T")[0] ?? null;
	return String(value).split("T")[0] ?? null;
}

function parseNum(value: unknown): number {
	if (value == null) return 0;
	if (typeof value === "number" && !Number.isNaN(value)) return value;
	if (typeof value === "string") return parseFloat(value) || 0;
	return 0;
}

export async function buscarDadosContasPagar({
	idempresa,
	dataInicio,
	dataFim,
}: BuscarDadosContasParams): Promise<ContasPagarItem[]> {
	const rows = await db.execute(
		sql`
			SELECT
				documento,
				emissao,
				vencimento,
				COALESCE(valor::numeric, 0) as valor,
				COALESCE(saldo::numeric, 0) as saldo,
				historico,
				status,
				emitente
			FROM financeiro
			WHERE
				idempresa = ${idempresa}
				AND tipo = 'P'
				AND vencimento IS NOT NULL
				AND vencimento >= ${dataInicio}::date
				AND vencimento <= ${dataFim}::date
			ORDER BY vencimento ASC, documento ASC
		`,
	);

	return (rows.rows as Record<string, unknown>[]).map((row) => ({
		documento: (row.documento as string | undefined) ?? null,
		emissao: parseDateStr(row.emissao as string | Date | null),
		vencimento: parseDateStr(row.vencimento as string | Date | null),
		valor: parseNum(row.valor),
		saldo: parseNum(row.saldo),
		historico: (row.historico as string | undefined) ?? null,
		status: (row.status as string | undefined) ?? null,
		emitente: (row.emitente as string | undefined) ?? null,
	}));
}

export async function buscarDadosContasReceber({
	idempresa,
	dataInicio,
	dataFim,
}: BuscarDadosContasParams): Promise<ContasReceberItem[]> {
	const rows = await db.execute(
		sql`
			SELECT
				documento,
				emissao,
				vencimento,
				COALESCE(valor::numeric, 0) as valor,
				COALESCE(saldo::numeric, 0) as saldo,
				historico,
				status,
				emitente
			FROM financeiro
			WHERE
				idempresa = ${idempresa}
				AND tipo = 'R'
				AND vencimento IS NOT NULL
				AND vencimento >= ${dataInicio}::date
				AND vencimento <= ${dataFim}::date
			ORDER BY vencimento ASC, documento ASC
		`,
	);

	return (rows.rows as Record<string, unknown>[]).map((row) => ({
		documento: (row.documento as string | undefined) ?? null,
		emissao: parseDateStr(row.emissao as string | Date | null),
		vencimento: parseDateStr(row.vencimento as string | Date | null),
		valor: parseNum(row.valor),
		saldo: parseNum(row.saldo),
		historico: (row.historico as string | undefined) ?? null,
		status: (row.status as string | undefined) ?? null,
		emitente: (row.emitente as string | undefined) ?? null,
	}));
}

export interface CentroCustosItem {
	codigo: string | null;
	nome: string;
	totalReceitas: number;
	totalDespesas: number;
	saldo: number;
}

export async function buscarDadosCentroCustos({
	idempresa,
}: {
	idempresa: string;
}): Promise<CentroCustosItem[]> {
	const rows = await db.execute(
		sql`
			SELECT c.codigoreduzido AS codigo, c.nome AS nome
			FROM centrocusto c
			WHERE c.idempresa = ${idempresa} AND COALESCE(c.inativo, 0) = 0
			ORDER BY c.codigoreduzido NULLS LAST, c.nome
		`,
	);
	return (rows.rows as Record<string, unknown>[]).map((row) => ({
		codigo: (row.codigo as string | undefined) ?? null,
		nome: String(row.nome ?? "-"),
		totalReceitas: 0,
		totalDespesas: 0,
		saldo: 0,
	}));
}

export interface DespesasPorCategoriaItem {
	codigo: string | null;
	nome: string | null;
	total: number;
}
export interface ReceitasPorCategoriaItem {
	codigo: string | null;
	nome: string | null;
	total: number;
}
export interface BuscarPorCategoriaParams {
	idempresa: string;
	dataInicio: string;
	dataFim: string;
}

export async function buscarDespesasPorCategoria({
	idempresa,
	dataInicio,
	dataFim,
}: BuscarPorCategoriaParams): Promise<DespesasPorCategoriaItem[]> {
	const rows = await db.execute(
		sql`
			SELECT pc.codigo, pc.nome, COALESCE(SUM(ccl.valor::numeric), 0) AS total
			FROM contacorrentelancamento ccl
			JOIN contacorrente cc ON cc.id = ccl.idcontacorrente
			LEFT JOIN planocontas pc ON pc.id = ccl.idplanocontas
			WHERE cc.idempresa = ${idempresa}
				AND TRIM(ccl.tipo) IN ('S', 'D') AND ccl.idplanocontas IS NOT NULL
				AND ccl.datahora >= ${dataInicio}::date AND ccl.datahora <= ${dataFim}::date
			GROUP BY pc.codigo, pc.nome ORDER BY total DESC
		`,
	);
	return (rows.rows as Record<string, unknown>[]).map((row) => ({
		codigo: (row.codigo as string | undefined) ?? null,
		nome: (row.nome as string | undefined) ?? null,
		total: parseNum(row.total),
	}));
}

export async function buscarReceitasPorCategoria({
	idempresa,
	dataInicio,
	dataFim,
}: BuscarPorCategoriaParams): Promise<ReceitasPorCategoriaItem[]> {
	const rows = await db.execute(
		sql`
			SELECT pc.codigo, pc.nome, COALESCE(SUM(ccl.valor::numeric), 0) AS total
			FROM contacorrentelancamento ccl
			JOIN contacorrente cc ON cc.id = ccl.idcontacorrente
			LEFT JOIN planocontas pc ON pc.id = ccl.idplanocontas
			WHERE cc.idempresa = ${idempresa}
				AND TRIM(ccl.tipo) IN ('E', 'C') AND ccl.idplanocontas IS NOT NULL
				AND ccl.datahora >= ${dataInicio}::date AND ccl.datahora <= ${dataFim}::date
			GROUP BY pc.codigo, pc.nome ORDER BY total DESC
		`,
	);
	return (rows.rows as Record<string, unknown>[]).map((row) => ({
		codigo: (row.codigo as string | undefined) ?? null,
		nome: (row.nome as string | undefined) ?? null,
		total: parseNum(row.total),
	}));
}

export interface FormasDePagamentoItem {
	formapagamento: string;
	totalReceitas: number;
	totalDespesas: number;
	saldo: number;
}

export async function buscarFormasDePagamento({
	idempresa,
	dataInicio,
	dataFim,
}: BuscarPorCategoriaParams): Promise<FormasDePagamentoItem[]> {
	const rows = await db.execute(
		sql`
			SELECT COALESCE(f.idportador::text, '0') AS portador_key,
				COALESCE(SUM(CASE WHEN f.tipo = 'R' THEN f.saldo::numeric ELSE 0 END), 0) AS tr,
				COALESCE(SUM(CASE WHEN f.tipo = 'P' THEN f.saldo::numeric ELSE 0 END), 0) AS td
			FROM financeiro f
			WHERE f.idempresa = ${idempresa} AND f.vencimento IS NOT NULL
				AND f.vencimento >= ${dataInicio}::date AND f.vencimento <= ${dataFim}::date
			GROUP BY f.idportador ORDER BY portador_key
		`,
	);
	return (rows.rows as Record<string, unknown>[]).map((row) => {
		const key = String(row.portador_key ?? "0");
		const totalReceitas = parseNum(row.tr);
		const totalDespesas = parseNum(row.td);
		return {
			formapagamento:
				key === "0" || key === "null" ? "Não informado" : `Portador ${key}`,
			totalReceitas,
			totalDespesas,
			saldo: totalReceitas - totalDespesas,
		};
	});
}

export interface InadimplenciaItem {
	documento: string | null;
	emitente: string | null;
	vencimento: string | null;
	valor: number;
	saldo: number;
	diasAtraso: number;
}

export async function buscarDadosInadimplencia({
	idempresa,
	dataInicio,
	dataFim,
}: BuscarPorCategoriaParams): Promise<InadimplenciaItem[]> {
	const rows = await db.execute(
		sql`
			SELECT f.documento, f.emitente, f.vencimento,
				COALESCE(f.valor::numeric, 0) AS valor, COALESCE(f.saldo::numeric, 0) AS saldo,
				GREATEST(0, (CURRENT_DATE - f.vencimento))::int AS dias_atraso
			FROM financeiro f
			WHERE f.idempresa = ${idempresa} AND f.status = 'A' AND f.saldo::numeric > 0
				AND f.vencimento IS NOT NULL AND f.vencimento < CURRENT_DATE
				AND f.vencimento >= ${dataInicio}::date AND f.vencimento <= ${dataFim}::date
			ORDER BY f.vencimento, f.documento
		`,
	);
	return (rows.rows as Record<string, unknown>[]).map((row) => ({
		documento: (row.documento as string | undefined) ?? null,
		emitente: (row.emitente as string | undefined) ?? null,
		vencimento: parseDateStr(row.vencimento as string | Date | null),
		valor: parseNum(row.valor),
		saldo: parseNum(row.saldo),
		diasAtraso: parseNum(row.dias_atraso),
	}));
}

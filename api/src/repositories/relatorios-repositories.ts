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

import { sql } from "drizzle-orm";
import { db } from "./connection.js";

function parseNum(valor: unknown): number {
	const n = Number(valor);
	return Number.isFinite(n) ? n : 0;
}

function parseDateStr(valor: unknown): string {
	if (valor instanceof Date) {
		return valor.toISOString().slice(0, 10);
	}
	const raw = String(valor ?? "");
	return raw.includes("T") ? (raw.split("T")[0] ?? raw) : raw.slice(0, 10);
}

/** Drizzle/node-pg pode devolver `{ rows }` ou um array direto. */
function rowsOf<T>(result: unknown): T[] {
	if (result && typeof result === "object" && "rows" in result) {
		const rows = (result as { rows?: unknown }).rows;
		if (Array.isArray(rows)) return rows as T[];
	}
	return (Array.isArray(result) ? result : []) as T[];
}

export type PontoPrecoCusto = {
	data: string;
	precoVenda: number | null;
	custo: number | null;
};

export type PontoCompraVenda = {
	data: string;
	compra: number;
	venda: number;
};

export type PontoEstoque = {
	data: string;
	entrada: number;
	saida: number;
	saldo: number;
};

export async function buscarSeriePrecoCusto({
	idempresa,
	idproduto,
	dataInicio,
	dataFim,
}: {
	idempresa: string;
	idproduto: string;
	dataInicio: string;
	dataFim: string;
}): Promise<PontoPrecoCusto[]> {
	const [custoAntesRaw, custosRaw, precoAntesRaw, precosRaw, produtoAtualRaw] =
		await Promise.all([
			db.execute(sql`
				SELECT COALESCE(custoaquisicao::numeric, customedio::numeric, custo::numeric, 0) AS custo,
					datahora::date::text AS data
				FROM custoproduto
				WHERE idproduto = ${idproduto}
					AND datahora::date < ${dataInicio}::date
				ORDER BY datahora DESC
				LIMIT 1
			`),
			db.execute(sql`
				SELECT COALESCE(custoaquisicao::numeric, customedio::numeric, custo::numeric, 0) AS custo,
					datahora::date::text AS data
				FROM custoproduto
				WHERE idproduto = ${idproduto}
					AND datahora::date >= ${dataInicio}::date
					AND datahora::date <= ${dataFim}::date
				ORDER BY datahora ASC
			`),
			db.execute(sql`
				SELECT COALESCE(
					(depois->>'preco')::numeric,
					(antes->>'preco')::numeric
				) AS preco,
					criadoem::date::text AS data
				FROM produto_historico
				WHERE idempresa = ${idempresa}
					AND idproduto = ${idproduto}
					AND criadoem::date < ${dataInicio}::date
					AND (
						depois->>'preco' IS NOT NULL
						OR antes->>'preco' IS NOT NULL
					)
				ORDER BY criadoem DESC
				LIMIT 1
			`),
			db.execute(sql`
				SELECT
					(depois->>'preco')::numeric AS preco,
					criadoem::date::text AS data
				FROM produto_historico
				WHERE idempresa = ${idempresa}
					AND idproduto = ${idproduto}
					AND criadoem::date >= ${dataInicio}::date
					AND criadoem::date <= ${dataFim}::date
					AND depois->>'preco' IS NOT NULL
					AND COALESCE(depois->>'preco', '') IS DISTINCT FROM COALESCE(antes->>'preco', '')
				ORDER BY criadoem ASC
			`),
			db.execute(sql`
				SELECT COALESCE(preco::numeric, 0) AS preco
				FROM produtos
				WHERE id = ${idproduto} AND idempresa = ${idempresa}
				LIMIT 1
			`),
		]);

	const custoAntes = rowsOf<Record<string, unknown>>(custoAntesRaw);
	const custos = rowsOf<Record<string, unknown>>(custosRaw);
	const precoAntes = rowsOf<Record<string, unknown>>(precoAntesRaw);
	const precos = rowsOf<Record<string, unknown>>(precosRaw);
	const produtoAtual = rowsOf<Record<string, unknown>>(produtoAtualRaw);

	type Evento = { data: string; precoVenda?: number; custo?: number };
	const eventos = new Map<string, Evento>();

	const garantir = (data: string): Evento => {
		const existente = eventos.get(data);
		if (existente) return existente;
		const novo: Evento = { data };
		eventos.set(data, novo);
		return novo;
	};

	for (const row of custos) {
		const data = parseDateStr(row.data);
		if (!data) continue;
		garantir(data).custo = parseNum(row.custo);
	}

	for (const row of precos) {
		const data = parseDateStr(row.data);
		if (!data) continue;
		garantir(data).precoVenda = parseNum(row.preco);
	}

	let custoAtual: number | null =
		custoAntes.length > 0 ? parseNum(custoAntes[0]?.custo) : null;
	let precoAtual: number | null =
		precoAntes.length > 0 ? parseNum(precoAntes[0]?.preco) : null;

	if (precoAtual === null) {
		const atual = produtoAtual[0];
		if (atual) precoAtual = parseNum(atual.preco);
	}

	const datasOrdenadas = [...eventos.keys()].sort();
	if (datasOrdenadas.length === 0) {
		if (precoAtual === null && custoAtual === null) return [];
		return [
			{
				data: dataInicio,
				precoVenda: precoAtual,
				custo: custoAtual,
			},
		];
	}

	const pontos: PontoPrecoCusto[] = [];
	for (const data of datasOrdenadas) {
		const evento = eventos.get(data);
		if (!evento) continue;
		if (evento.custo !== undefined) custoAtual = evento.custo;
		if (evento.precoVenda !== undefined) precoAtual = evento.precoVenda;
		pontos.push({
			data,
			precoVenda: precoAtual,
			custo: custoAtual,
		});
	}

	return pontos;
}

export async function buscarSerieCompraVenda({
	idempresa,
	idproduto,
	dataInicio,
	dataFim,
	granularidade = "dia",
}: {
	idempresa: string;
	idproduto: string;
	dataInicio: string;
	dataFim: string;
	granularidade?: "dia" | "semana" | "mes";
}): Promise<PontoCompraVenda[]> {
	const bucket =
		granularidade === "semana"
			? sql`date_trunc('week', COALESCE(me.datahora, me.data::timestamp))`
			: granularidade === "mes"
				? sql`date_trunc('month', COALESCE(me.datahora, me.data::timestamp))`
				: sql`date_trunc('day', COALESCE(me.datahora, me.data::timestamp))`;

	const resultado = await db.execute(sql`
		SELECT ${bucket}::date::text AS data,
			COALESCE(SUM(me.quantidadeentrada::numeric), 0) AS compra,
			COALESCE(SUM(me.quantidadesaida::numeric), 0) AS venda
		FROM movimentoestoque me
		WHERE me.idempresa = ${idempresa}
			AND me.idproduto = ${idproduto}
			AND COALESCE(me.cancelado, 0) = 0
			AND COALESCE(me.datahora, me.data::timestamp)::date >= ${dataInicio}::date
			AND COALESCE(me.datahora, me.data::timestamp)::date <= ${dataFim}::date
		GROUP BY 1
		ORDER BY 1 ASC
	`);

	return rowsOf<Record<string, unknown>>(resultado).map((row) => ({
		data: parseDateStr(row.data),
		compra: parseNum(row.compra),
		venda: parseNum(row.venda),
	}));
}

export async function buscarSerieEstoque({
	idempresa,
	idproduto,
	dataInicio,
	dataFim,
	tipoEstoque = 0,
}: {
	idempresa: string;
	idproduto: string;
	dataInicio: string;
	dataFim: string;
	tipoEstoque?: number;
}): Promise<PontoEstoque[]> {
	const filtroTipo =
		tipoEstoque === 0
			? sql`AND me.tipoestoque IN (0, 2)`
			: tipoEstoque === 1
				? sql`AND me.tipoestoque IN (1, 2)`
				: sql``;

	const [aberturaRaw, movimentosRaw] = await Promise.all([
		db.execute(sql`
			SELECT COALESCE(
				SUM(
					COALESCE(me.quantidadeentrada::numeric, 0)
					- COALESCE(me.quantidadesaida::numeric, 0)
				),
				0
			) AS saldo
			FROM movimentoestoque me
			WHERE me.idempresa = ${idempresa}
				AND me.idproduto = ${idproduto}
				AND COALESCE(me.cancelado, 0) = 0
				AND COALESCE(me.datahora, me.data::timestamp)::date < ${dataInicio}::date
				${filtroTipo}
		`),
		db.execute(sql`
			SELECT COALESCE(me.datahora, me.data::timestamp)::date::text AS data,
				COALESCE(SUM(me.quantidadeentrada::numeric), 0) AS entrada,
				COALESCE(SUM(me.quantidadesaida::numeric), 0) AS saida
			FROM movimentoestoque me
			WHERE me.idempresa = ${idempresa}
				AND me.idproduto = ${idproduto}
				AND COALESCE(me.cancelado, 0) = 0
				AND COALESCE(me.datahora, me.data::timestamp)::date >= ${dataInicio}::date
				AND COALESCE(me.datahora, me.data::timestamp)::date <= ${dataFim}::date
				${filtroTipo}
			GROUP BY 1
			ORDER BY 1 ASC
		`),
	]);

	let saldo = parseNum(rowsOf<Record<string, unknown>>(aberturaRaw)[0]?.saldo);
	const pontos: PontoEstoque[] = [];

	for (const row of rowsOf<Record<string, unknown>>(movimentosRaw)) {
		const entrada = parseNum(row.entrada);
		const saida = parseNum(row.saida);
		saldo += entrada - saida;
		pontos.push({
			data: parseDateStr(row.data),
			entrada,
			saida,
			saldo,
		});
	}

	if (pontos.length === 0) {
		return [
			{
				data: dataInicio,
				entrada: 0,
				saida: 0,
				saldo,
			},
		];
	}

	return pontos;
}

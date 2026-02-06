import { and, eq, isNotNull, sql, sum } from "drizzle-orm";
import * as schema from "../../drizzle/schema.js";
import { db } from "./connection.js";

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

export async function buscarDadosDashboard({
	idempresa,
}: {
	idempresa: string;
}): Promise<DashboardData> {
	// Buscar total de contas a pagar (soma dos saldos onde tipo="P" e status="A")
	const [contasPagar] = await db
		.select({
			total: sum(schema.financeiro.saldo),
		})
		.from(schema.financeiro)
		.where(
			and(
				eq(schema.financeiro.idempresa, idempresa),
				eq(schema.financeiro.tipo, "P"),
				eq(schema.financeiro.status, "A"),
			),
		);

	// Buscar total de contas a receber (soma dos saldos onde tipo="R" e status="A")
	const [contasReceber] = await db
		.select({
			total: sum(schema.financeiro.saldo),
		})
		.from(schema.financeiro)
		.where(
			and(
				eq(schema.financeiro.idempresa, idempresa),
				eq(schema.financeiro.tipo, "R"),
				eq(schema.financeiro.status, "A"),
			),
		);

	// Buscar todas as contas correntes da empresa
	const contasCorrentes = await db
		.select({
			id: schema.contacorrente.id,
			caixa: schema.contacorrente.caixa,
		})
		.from(schema.contacorrente)
		.where(eq(schema.contacorrente.idempresa, idempresa));

	// Separar contas bancárias e caixa
	const contasBancarias = contasCorrentes.filter(
		(cc) => !cc.caixa || cc.caixa !== 1,
	);
	const contasCaixa = contasCorrentes.filter((cc) => cc.caixa === 1);

	// Buscar últimos saldos de contas bancárias
	let saldoBancarioTotal = "0.00";
	if (contasBancarias.length > 0) {
		const idsBancarias = contasBancarias.map((cc) => cc.id);
		const ultimosLancamentosBancarios = await Promise.all(
			idsBancarias.map(async (idcontacorrente) => {
				const [ultimo] = await db
					.select({
						saldoatual: schema.contacorrentelancamento.saldoatual,
					})
					.from(schema.contacorrentelancamento)
					.where(
						eq(schema.contacorrentelancamento.idcontacorrente, idcontacorrente),
					)
					.orderBy(
						sql`${schema.contacorrentelancamento.currenttimemillis} DESC NULLS LAST, ${schema.contacorrentelancamento.datahora} DESC NULLS LAST`,
					)
					.limit(1);
				return ultimo?.saldoatual || "0.00";
			}),
		);

		const somaBancaria = ultimosLancamentosBancarios.reduce(
			(acc, saldo) => acc + parseFloat(saldo || "0"),
			0,
		);
		saldoBancarioTotal = somaBancaria.toFixed(2);
	}

	// Buscar últimos saldos de contas caixa
	let saldoCaixaTotal = "0.00";
	if (contasCaixa.length > 0) {
		const idsCaixa = contasCaixa.map((cc) => cc.id);
		const ultimosLancamentosCaixa = await Promise.all(
			idsCaixa.map(async (idcontacorrente) => {
				const [ultimo] = await db
					.select({
						saldoatual: schema.contacorrentelancamento.saldoatual,
					})
					.from(schema.contacorrentelancamento)
					.where(
						eq(schema.contacorrentelancamento.idcontacorrente, idcontacorrente),
					)
					.orderBy(
						sql`${schema.contacorrentelancamento.currenttimemillis} DESC NULLS LAST, ${schema.contacorrentelancamento.datahora} DESC NULLS LAST`,
					)
					.limit(1);
				return ultimo?.saldoatual || "0.00";
			}),
		);

		const somaCaixa = ultimosLancamentosCaixa.reduce(
			(acc, saldo) => acc + parseFloat(saldo || "0"),
			0,
		);
		saldoCaixaTotal = somaCaixa.toFixed(2);
	}

	// Contar usuários associados à empresa
	const [usuariosCount] = await db
		.select({
			value: sql<number>`COUNT(*)::int`,
		})
		.from(schema.usuarioEmpresa)
		.where(eq(schema.usuarioEmpresa.idempresa, idempresa));

	return {
		totalContasPagar: contasPagar?.total || "0.00",
		totalContasReceber: contasReceber?.total || "0.00",
		saldoBancario: saldoBancarioTotal,
		saldoCaixa: saldoCaixaTotal,
		quantidadeUsuarios: usuariosCount?.value || 0,
	};
}

export async function buscarHistoricoFinanceiro({
	idempresa,
	dias,
}: {
	idempresa: string;
	dias: number;
}): Promise<HistoricoFinanceiroItem[]> {
	const dataInicio = new Date();
	dataInicio.setDate(dataInicio.getDate() - dias);
	const dataInicioStr = dataInicio.toISOString().split("T")[0];

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
				AND vencimento >= ${dataInicioStr}::date
			GROUP BY vencimento
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
				AND vencimento >= ${dataInicioStr}::date
			GROUP BY vencimento
		`,
	);

	// Criar um mapa de datas para facilitar a junção
	const mapaDados = new Map<
		string,
		{ contasPagar: number; contasReceber: number }
	>();

	// Processar contas a pagar
	for (const row of contasPagarPorData.rows) {
		const date = row.date as string | Date | null;
		if (date) {
			// Converter data para string no formato YYYY-MM-DD
			const dateStr = typeof date === "string" 
				? date.split("T")[0] 
				: date instanceof Date 
					? date.toISOString().split("T")[0] 
					: String(date).split("T")[0];
			
			if (!mapaDados.has(dateStr)) {
				mapaDados.set(dateStr, { contasPagar: 0, contasReceber: 0 });
			}
			const dados = mapaDados.get(dateStr);
			if (dados) {
				// Converter total para número
				const total = typeof row.total === "string" 
					? parseFloat(row.total) || 0 
					: Number(row.total) || 0;
				dados.contasPagar = total;
			}
		}
	}

	// Processar contas a receber
	for (const row of contasReceberPorData.rows) {
		const date = row.date as string | Date | null;
		if (date) {
			// Converter data para string no formato YYYY-MM-DD
			const dateStr = typeof date === "string" 
				? date.split("T")[0] 
				: date instanceof Date 
					? date.toISOString().split("T")[0] 
					: String(date).split("T")[0];
			
			if (!mapaDados.has(dateStr)) {
				mapaDados.set(dateStr, { contasPagar: 0, contasReceber: 0 });
			}
			const dados = mapaDados.get(dateStr);
			if (dados) {
				// Converter total para número
				const total = typeof row.total === "string" 
					? parseFloat(row.total) || 0 
					: Number(row.total) || 0;
				dados.contasReceber = total;
			}
		}
	}

	// Gerar todas as datas do período (preencher dias sem dados com 0)
	const resultado: HistoricoFinanceiroItem[] = [];
	const hoje = new Date();
	hoje.setHours(0, 0, 0, 0);

	for (let i = dias - 1; i >= 0; i--) {
		const data = new Date(hoje);
		data.setDate(data.getDate() - i);
		const dateStr = data.toISOString().split("T")[0];

		if (dateStr) {
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
	}

	return resultado;
}

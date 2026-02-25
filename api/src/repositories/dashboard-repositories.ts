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
/*                           HISTÓRICO FINANCEIRO                             */
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
/*                           ÚLTIMAS MOVIMENTAÇÕES                            */
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
		descricao: m.descricao || m.documento || "Sem descrição",
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
		descricao: m.descricao || "Sem descrição",
		valor: m.valor || "0.00",
		data: toDateString(m.data),
		status: m.status,
		usuario: m.usuario || "Sistema",
		tipo: "B",
		natureza: m.tipo === "E" ? "entrada" : "saida",
	}));
}

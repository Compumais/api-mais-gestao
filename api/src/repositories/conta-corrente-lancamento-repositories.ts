import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import type { NovaContaCorrenteLancamento } from "@/model/conta-corrente-lancamento-model.js";
import type { ChaveLancamentoExistente } from "@/util/chave-lancamento-conta-corrente.js";
import { montarChaveLancamentoExistente } from "@/util/chave-lancamento-conta-corrente.js";
import * as schema from "../../drizzle/schema.js";
import { db } from "./connection.js";

export type { ChaveLancamentoExistente };

export type LancamentoExistentePorChave = {
	id: string;
	idplanocontas: string | null;
};

export async function criarContaCorrenteLancamento(
	dados: NovaContaCorrenteLancamento,
) {
	const [contaCorrenteLancamento] = await db
		.insert(schema.contacorrentelancamento)
		.values(dados)
		.returning();

	return contaCorrenteLancamento;
}

export async function buscarContaCorrenteLancamentoPorId({
	id,
}: {
	id: string;
}) {
	const [contaCorrenteLancamento] = await db
		.select({
			id: schema.contacorrentelancamento.id,
			idcontacorrente: schema.contacorrentelancamento.idcontacorrente,
			datahora: schema.contacorrentelancamento.datahora,
			tipo: schema.contacorrentelancamento.tipo,
			valor: schema.contacorrentelancamento.valor,
			saldoanterior: schema.contacorrentelancamento.saldoanterior,
			saldoatual: schema.contacorrentelancamento.saldoatual,
			historico: schema.contacorrentelancamento.historico,
			idusuario: schema.contacorrentelancamento.idusuario,
			idplanocontas: schema.contacorrentelancamento.idplanocontas,
			evento: schema.contacorrentelancamento.evento,
			debito: schema.contacorrentelancamento.debito,
			documento: schema.contacorrentelancamento.documento,
			currenttimemillis: schema.contacorrentelancamento.currenttimemillis,
			identificado: schema.contacorrentelancamento.identificado,
			depositonaoidentificado:
				schema.contacorrentelancamento.depositonaoidentificado,
			tiporateiocentrocusto:
				schema.contacorrentelancamento.tiporateiocentrocusto,
			idlancamentotransferencia:
				schema.contacorrentelancamento.idlancamentotransferencia,
			dataconciliacao: schema.contacorrentelancamento.dataconciliacao,
			idusuarioconciliacao: schema.contacorrentelancamento.idusuarioconciliacao,
			idlancamentoestornado:
				schema.contacorrentelancamento.idlancamentoestornado,

			// 🔹 Plano de contas
			planocontasnome: schema.planocontas.nome,
			planocontascodigo: schema.planocontas.codigo,

			// 🔹 Conta corrente
			contacorrentedescricao: schema.contacorrente.descricao,
			contacorrenteagencia: schema.contacorrente.agencia,
		})
		.from(schema.contacorrentelancamento)
		.leftJoin(
			schema.planocontas,
			sql`${schema.contacorrentelancamento.idplanocontas}::text = ${schema.planocontas.id}`,
		)
		.leftJoin(
			schema.contacorrente,
			eq(
				schema.contacorrentelancamento.idcontacorrente,
				schema.contacorrente.id,
			),
		)
		.leftJoin(
			db
				.selectDistinctOn([schema.financeirolancamento.evento], {
					evento: schema.financeirolancamento.evento,
					idfinanceiro: schema.financeirolancamento.idfinanceiro,
				})
				.from(schema.financeirolancamento)
				.orderBy(schema.financeirolancamento.evento)
				.as("fl"),
			eq(schema.contacorrentelancamento.evento, sql`fl.evento`),
		)
		.leftJoin(schema.financeiro, eq(sql`fl.idfinanceiro`, schema.financeiro.id))
		.leftJoin(
			schema.entidade,
			eq(schema.financeiro.identidade, schema.entidade.id),
		)
		.where(eq(schema.contacorrentelancamento.id, id));

	return contaCorrenteLancamento as LancamentoComRelacionamentos | undefined;
}

export async function buscarUltimoLancamentoContaCorrente({
	idcontacorrente,
}: {
	idcontacorrente: string;
}) {
	const [ultimoLancamento] = await db
		.select()
		.from(schema.contacorrentelancamento)
		.where(eq(schema.contacorrentelancamento.idcontacorrente, idcontacorrente))
		.orderBy(
			desc(schema.contacorrentelancamento.datahora),
			desc(schema.contacorrentelancamento.currenttimemillis),
		)
		.limit(1);

	return ultimoLancamento;
}

export interface LancamentoComRelacionamentos {
	id: string;
	idcontacorrente: string;
	datahora: string | null;
	tipo: string | null;
	valor: string | null;
	saldoanterior: string | null;
	saldoatual: string | null;
	historico: string | null;
	idusuario: string | null;
	idplanocontas: string | null;
	evento: number | null;
	debito: string | null;
	documento: string | null;
	currenttimemillis: number | null;
	identificado: number | null;
	depositonaoidentificado: number | null;
	tiporateiocentrocusto: number | null;
	idlancamentotransferencia: number | null;
	dataconciliacao: string | null;
	idusuarioconciliacao: string | null;
	idlancamentoestornado: number | null;
	// Relacionamentos
	planocontasnome: string | null;
	planocontascodigo: string | null;
	contacorrentedescricao: string | null;
	contacorrenteagencia: string | null;
}

export async function listarLancamentoContaCorrentePorEmpresa({
	idcontacorrente,
	page = 1,
	limit = 10,
}: {
	idcontacorrente: string;
	page?: number;
	limit?: number;
}) {
	const offset = (page - 1) * limit;

	const [totalCount, lancamentos] = await Promise.all([
		db
			.select({ value: count() })
			.from(schema.contacorrentelancamento)
			.where(
				eq(schema.contacorrentelancamento.idcontacorrente, idcontacorrente),
			),
		db
			.select({
				id: schema.contacorrentelancamento.id,
				idcontacorrente: schema.contacorrentelancamento.idcontacorrente,
				datahora: schema.contacorrentelancamento.datahora,
				tipo: schema.contacorrentelancamento.tipo,
				valor: schema.contacorrentelancamento.valor,
				saldoanterior: schema.contacorrentelancamento.saldoanterior,
				saldoatual: schema.contacorrentelancamento.saldoatual,
				historico: schema.contacorrentelancamento.historico,
				idusuario: schema.contacorrentelancamento.idusuario,
				idplanocontas: schema.contacorrentelancamento.idplanocontas,
				evento: schema.contacorrentelancamento.evento,
				debito: schema.contacorrentelancamento.debito,
				documento: schema.contacorrentelancamento.documento,
				currenttimemillis: schema.contacorrentelancamento.currenttimemillis,
				identificado: schema.contacorrentelancamento.identificado,
				depositonaoidentificado:
					schema.contacorrentelancamento.depositonaoidentificado,
				tiporateiocentrocusto:
					schema.contacorrentelancamento.tiporateiocentrocusto,
				idlancamentotransferencia:
					schema.contacorrentelancamento.idlancamentotransferencia,
				dataconciliacao: schema.contacorrentelancamento.dataconciliacao,
				idusuarioconciliacao:
					schema.contacorrentelancamento.idusuarioconciliacao,
				idlancamentoestornado:
					schema.contacorrentelancamento.idlancamentoestornado,
				planocontasnome: schema.planocontas.nome,
				planocontascodigo: schema.planocontas.codigo,
				contacorrentedescricao: schema.contacorrente.descricao,
				contacorrenteagencia: schema.contacorrente.agencia,
			})
			.from(schema.contacorrentelancamento)
			.leftJoin(
				schema.planocontas,
				sql`${schema.contacorrentelancamento.idplanocontas}::text = ${schema.planocontas.id}`,
			)
			.leftJoin(
				schema.contacorrente,
				eq(
					schema.contacorrentelancamento.idcontacorrente,
					schema.contacorrente.id,
				),
			)
			.leftJoin(
				db
					.selectDistinctOn([schema.financeirolancamento.evento], {
						evento: schema.financeirolancamento.evento,
						idfinanceiro: schema.financeirolancamento.idfinanceiro,
					})
					.from(schema.financeirolancamento)
					.orderBy(schema.financeirolancamento.evento)
					.as("fl"),
				eq(schema.contacorrentelancamento.evento, sql`fl.evento`),
			)
			.leftJoin(
				schema.financeiro,
				eq(sql`fl.idfinanceiro`, schema.financeiro.id),
			)
			.where(
				eq(schema.contacorrentelancamento.idcontacorrente, idcontacorrente),
			)
			.orderBy(desc(schema.contacorrentelancamento.datahora))
			.limit(limit)
			.offset(offset),
	]);

	return {
		lancamentos: lancamentos as LancamentoComRelacionamentos[],
		total: totalCount[0]?.value ?? 0,
	};
}

export async function excluirContaCorrenteLancamento({ id }: { id: string }) {
	await db
		.delete(schema.contacorrentelancamento)
		.where(eq(schema.contacorrentelancamento.id, id))
		.returning();
}

export async function buscarLancamentoContaCorrentePorId({
	id,
}: {
	id: string;
}) {
	const [lancamento] = await db
		.select()
		.from(schema.contacorrentelancamento)
		.where(eq(schema.contacorrentelancamento.id, id));

	return lancamento;
}

export async function atualizarContaCorrenteLancamento({
	id,
	dados,
}: {
	id: string;
	dados: Partial<NovaContaCorrenteLancamento>;
}) {
	const [lancamento] = await db
		.update(schema.contacorrentelancamento)
		.set(dados)
		.where(eq(schema.contacorrentelancamento.id, id))
		.returning();

	return lancamento;
}

export async function listarDocumentosExistentesPorConta({
	idcontacorrente,
	documentos,
}: {
	idcontacorrente: string;
	documentos: string[];
}) {
	if (documentos.length === 0) {
		return [];
	}

	const registros = await db
		.select({ documento: schema.contacorrentelancamento.documento })
		.from(schema.contacorrentelancamento)
		.where(
			and(
				eq(schema.contacorrentelancamento.idcontacorrente, idcontacorrente),
				inArray(schema.contacorrentelancamento.documento, documentos),
			),
		);

	return registros
		.map((registro) => registro.documento)
		.filter((documento): documento is string => !!documento);
}

export async function buscarLancamentosExistentesPorChaves({
	idcontacorrente,
	chaves,
}: {
	idcontacorrente: string;
	chaves: ChaveLancamentoExistente[];
}): Promise<Map<string, LancamentoExistentePorChave>> {
	const mapa = new Map<string, LancamentoExistentePorChave>();

	if (chaves.length === 0) {
		return mapa;
	}

	const datas = [...new Set(chaves.map((chave) => chave.data))];

	const registros = await db
		.select({
			id: schema.contacorrentelancamento.id,
			datahora: schema.contacorrentelancamento.datahora,
			valor: schema.contacorrentelancamento.valor,
			tipo: schema.contacorrentelancamento.tipo,
			idplanocontas: schema.contacorrentelancamento.idplanocontas,
			currenttimemillis: schema.contacorrentelancamento.currenttimemillis,
		})
		.from(schema.contacorrentelancamento)
		.where(
			and(
				eq(schema.contacorrentelancamento.idcontacorrente, idcontacorrente),
				inArray(schema.contacorrentelancamento.datahora, datas),
			),
		)
		.orderBy(desc(schema.contacorrentelancamento.currenttimemillis));

	for (const registro of registros) {
		if (!registro.datahora || !registro.valor || !registro.tipo) {
			continue;
		}

		const chave = montarChaveLancamentoExistente({
			data: registro.datahora,
			valor: registro.valor,
			tipo: registro.tipo as "C" | "D",
		});

		if (!mapa.has(chave)) {
			mapa.set(chave, {
				id: registro.id,
				idplanocontas: registro.idplanocontas,
			});
		}
	}

	return mapa;
}

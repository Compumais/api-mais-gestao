import { and, asc, count, desc, eq, inArray, type SQL } from "drizzle-orm";
import type {
	NovaConciliacaoCielo,
	NovoConciliacaoCieloItem,
} from "@/model/conciliacao-cielo-model.js";
import {
	conciliacaocielo,
	conciliacaocieloitem,
	entidade,
	financeiro,
} from "@/repositories/schema.js";
import { db } from "./connection.js";

export async function criarConciliacaoCielo(dados: NovaConciliacaoCielo) {
	const [registro] = await db.insert(conciliacaocielo).values(dados).returning();
	return registro;
}

export async function criarConciliacaoCieloItens(
	itens: NovoConciliacaoCieloItem[],
) {
	if (itens.length === 0) return [];
	return db.insert(conciliacaocieloitem).values(itens).returning();
}

export async function buscarConciliacaoCieloPorChecksum(
	idempresa: string,
	checksum: string,
) {
	const [registro] = await db
		.select()
		.from(conciliacaocielo)
		.where(
			and(
				eq(conciliacaocielo.idempresa, idempresa),
				eq(conciliacaocielo.checksum, checksum),
			),
		);
	return registro;
}

export async function buscarConciliacaoCieloPorIdEempresa(
	id: string,
	idempresa: string,
) {
	const [registro] = await db
		.select()
		.from(conciliacaocielo)
		.where(
			and(eq(conciliacaocielo.id, id), eq(conciliacaocielo.idempresa, idempresa)),
		);
	return registro;
}

export async function listarConciliacoesCielo(parametros: {
	idempresa: string;
	page?: number;
	limit?: number;
}) {
	const page = parametros.page ?? 1;
	const limit = parametros.limit ?? 20;
	const offset = (page - 1) * limit;
	const filtro = eq(conciliacaocielo.idempresa, parametros.idempresa);
	const [totalCount, registros] = await Promise.all([
		db.select({ value: count() }).from(conciliacaocielo).where(filtro),
		db
			.select()
			.from(conciliacaocielo)
			.where(filtro)
			.orderBy(desc(conciliacaocielo.criadoem))
			.limit(limit)
			.offset(offset),
	]);
	return {
		data: registros,
		total: totalCount[0]?.value ?? 0,
	};
}

export async function listarItensConciliacaoCielo(idconciliacao: string) {
	return db
		.select({
			item: conciliacaocieloitem,
			documento: financeiro.documento,
			historico: financeiro.historico,
			valorfinanceiro: financeiro.valor,
			saldofinanceiro: financeiro.saldo,
			statusfinanceiro: financeiro.status,
			nomecliente: entidade.nome,
			razaosocial: entidade.razaosocial,
		})
		.from(conciliacaocieloitem)
		.leftJoin(financeiro, eq(conciliacaocieloitem.idfinanceiro, financeiro.id))
		.leftJoin(entidade, eq(financeiro.identidade, entidade.id))
		.where(eq(conciliacaocieloitem.idconciliacao, idconciliacao))
		.orderBy(asc(conciliacaocieloitem.linhacsv));
}

export async function buscarItemConciliacaoCieloPorId(id: string) {
	const [registro] = await db
		.select()
		.from(conciliacaocieloitem)
		.where(eq(conciliacaocieloitem.id, id));
	return registro;
}

export async function atualizarItemConciliacaoCielo(
	id: string,
	dados: Partial<NovoConciliacaoCieloItem>,
) {
	const [registro] = await db
		.update(conciliacaocieloitem)
		.set(dados)
		.where(eq(conciliacaocieloitem.id, id))
		.returning();
	return registro;
}

export async function atualizarConciliacaoCielo(
	id: string,
	dados: Partial<NovaConciliacaoCielo>,
) {
	const [registro] = await db
		.update(conciliacaocielo)
		.set(dados)
		.where(eq(conciliacaocielo.id, id))
		.returning();
	return registro;
}

export async function listarTitulosReceberParaCielo(parametros: {
	idempresa: string;
	datainicio?: string | null;
	datafim?: string | null;
}) {
	void parametros.datainicio;
	void parametros.datafim;

	const where: SQL[] = [
		eq(financeiro.idempresa, parametros.idempresa),
		eq(financeiro.tipo, "R"),
		eq(financeiro.status, "A"),
	];

	const registros = await db
		.select({
			id: financeiro.id,
			documento: financeiro.documento,
			historico: financeiro.historico,
			nossonumero: financeiro.nossonumero,
			nomebandeira: financeiro.nomebandeira,
			valor: financeiro.valor,
			saldo: financeiro.saldo,
			emissao: financeiro.emissao,
			vencimento: financeiro.vencimento,
			parcela: financeiro.parcela,
			totalparcelas: financeiro.totalparcelas,
			extra1: financeiro.extra1,
			extra2: financeiro.extra2,
			extra3: financeiro.extra3,
			extra4: financeiro.extra4,
			extra5: financeiro.extra5,
			nomecliente: entidade.nome,
			razaosocial: entidade.razaosocial,
		})
		.from(financeiro)
		.leftJoin(entidade, eq(financeiro.identidade, entidade.id))
		.where(and(...where))
		.orderBy(desc(financeiro.emissao))
		.limit(2000);

	return registros;
}

export async function listarItensConciliacaoPorIds(ids: string[]) {
	if (ids.length === 0) return [];
	return db
		.select()
		.from(conciliacaocieloitem)
		.where(inArray(conciliacaocieloitem.id, ids));
}

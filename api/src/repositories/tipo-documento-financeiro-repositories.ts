import { and, count, desc, eq, ilike } from "drizzle-orm";
import type { NovoTipoDocumentoFinanceiro } from "@/model/tipo-documento-financeiro-model";
import { tipodocumentofinanceiro } from "@/repositories/schema.js";
import { filtroRegistroAtivo } from "@/util/filtro-registro-ativo.js";
import { db } from "./connection";

export async function buscarTipoDocumentoFinanceiroPorId(id: string) {
	const [registro] = await db
		.select()
		.from(tipodocumentofinanceiro)
		.where(eq(tipodocumentofinanceiro.id, id));

	return registro;
}

export async function criarTipoDocumentoFinanceiro(
	dadosTipoDocumentoFinanceiro: NovoTipoDocumentoFinanceiro,
) {
	const [registro] = await db
		.insert(tipodocumentofinanceiro)
		.values(dadosTipoDocumentoFinanceiro)
		.returning();

	return registro;
}

export async function atualizarTipoDocumentoFinanceiro(
	id: string,
	dadosTipoDocumentoFinanceiro: Partial<NovoTipoDocumentoFinanceiro>,
) {
	const [registro] = await db
		.update(tipodocumentofinanceiro)
		.set(dadosTipoDocumentoFinanceiro)
		.where(eq(tipodocumentofinanceiro.id, id))
		.returning();

	return registro;
}

export async function excluirTipoDocumentoFinanceiro(id: string) {
	const [registro] = await db
		.delete(tipodocumentofinanceiro)
		.where(eq(tipodocumentofinanceiro.id, id))
		.returning();

	return registro;
}

export type ListarTiposDocumentoFinanceiroParametros = {
	idempresa: string;
	descricao?: string | undefined;
	inativo?: number | undefined;
	page?: number;
	limit?: number;
};

export async function listarTiposDocumentoFinanceiro({
	idempresa,
	descricao,
	inativo,
	page = 1,
	limit = 10,
}: ListarTiposDocumentoFinanceiroParametros) {
	const where = [];

	where.push(eq(tipodocumentofinanceiro.idempresa, idempresa));

	if (descricao) {
		where.push(ilike(tipodocumentofinanceiro.descricao, `%${descricao}%`));
	}

	if (inativo !== undefined) {
		const filtroInativo = filtroRegistroAtivo(
			tipodocumentofinanceiro.inativo,
			inativo,
		);
		if (filtroInativo) {
			where.push(filtroInativo);
		}
	}

	const offset = (page - 1) * limit;

	const [totalCount, tiposdocumentofinanceiro] = await Promise.all([
		db
			.select({ value: count() })
			.from(tipodocumentofinanceiro)
			.where(and(...where)),
		db
			.select()
			.from(tipodocumentofinanceiro)
			.where(and(...where))
			.orderBy(desc(tipodocumentofinanceiro.descricao))
			.limit(limit)
			.offset(offset),
	]);

	return {
		tiposdocumentofinanceiro,
		total: totalCount[0]?.value ?? 0,
	};
}

export async function verificarEmpresaPossuiTiposDocumentoFinanceiro(
	idempresa: string,
) {
	const [resultado] = await db
		.select({ value: count() })
		.from(tipodocumentofinanceiro)
		.where(eq(tipodocumentofinanceiro.idempresa, idempresa));

	return (resultado?.value ?? 0) > 0;
}

export async function criarTiposDocumentoFinanceiroEmLote(
	registros: NovoTipoDocumentoFinanceiro[],
) {
	if (registros.length === 0) {
		return [];
	}

	return db.insert(tipodocumentofinanceiro).values(registros).returning();
}

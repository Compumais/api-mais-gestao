import { and, count, desc, eq, ilike } from "drizzle-orm";
import type { NovaBandeiraCartao } from "@/model/bandeira-cartao-model";
import { bandeiracartao } from "@/repositories/schema.js";
import { filtroRegistroAtivo } from "@/util/filtro-registro-ativo.js";
import { db } from "./connection";

export async function buscarBandeiraCartaoPorId(id: string) {
	const [registro] = await db
		.select()
		.from(bandeiracartao)
		.where(eq(bandeiracartao.id, id));

	return registro;
}

export async function criarBandeiraCartao(dados: NovaBandeiraCartao) {
	const [registro] = await db.insert(bandeiracartao).values(dados).returning();

	return registro;
}

export async function atualizarBandeiraCartao(
	id: string,
	dados: Partial<NovaBandeiraCartao>,
) {
	const [registro] = await db
		.update(bandeiracartao)
		.set(dados)
		.where(eq(bandeiracartao.id, id))
		.returning();

	return registro;
}

export async function excluirBandeiraCartao(id: string) {
	const [registro] = await db
		.delete(bandeiracartao)
		.where(eq(bandeiracartao.id, id))
		.returning();

	return registro;
}

export type ListarBandeirasCartaoParametros = {
	idempresa: string;
	descricao?: string | undefined;
	inativo?: number | undefined;
	page?: number;
	limit?: number;
};

export async function listarBandeirasCartao({
	idempresa,
	descricao,
	inativo,
	page = 1,
	limit = 10,
}: ListarBandeirasCartaoParametros) {
	const where = [];

	where.push(eq(bandeiracartao.idempresa, idempresa));

	if (descricao) {
		where.push(ilike(bandeiracartao.descricao, `%${descricao}%`));
	}

	if (inativo !== undefined) {
		const filtroInativo = filtroRegistroAtivo(bandeiracartao.inativo, inativo);
		if (filtroInativo) {
			where.push(filtroInativo);
		}
	}

	const offset = (page - 1) * limit;

	const [totalCount, bandeiras] = await Promise.all([
		db
			.select({ value: count() })
			.from(bandeiracartao)
			.where(and(...where)),
		db
			.select()
			.from(bandeiracartao)
			.where(and(...where))
			.orderBy(desc(bandeiracartao.descricao))
			.limit(limit)
			.offset(offset),
	]);

	return {
		bandeiras,
		total: totalCount[0]?.value ?? 0,
	};
}

export async function verificarEmpresaPossuiBandeirasCartao(idempresa: string) {
	const [resultado] = await db
		.select({ value: count() })
		.from(bandeiracartao)
		.where(eq(bandeiracartao.idempresa, idempresa));

	return (resultado?.value ?? 0) > 0;
}

export async function criarBandeirasCartaoEmLote(
	registros: NovaBandeiraCartao[],
) {
	if (registros.length === 0) {
		return [];
	}

	return db.insert(bandeiracartao).values(registros).returning();
}

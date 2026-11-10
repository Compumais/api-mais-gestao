import {
	and,
	asc,
	eq,
	inArray,
	isNotNull,
	isNull,
	ne,
	or,
	sql,
} from "drizzle-orm";
import type { NovoDavItem } from "@/model/dav-item-model.js";
import { dav, davitem } from "@/repositories/schema.js";
import { db } from "./connection.js";

export async function buscarDavItemPorId(id: string) {
	const [registro] = await db.select().from(davitem).where(eq(davitem.id, id));

	return registro;
}

export async function listarItensPorDav(iddav: string) {
	return db
		.select()
		.from(davitem)
		.where(
			and(
				eq(davitem.iddav, iddav),
				or(eq(davitem.cancelado, 0), isNull(davitem.cancelado)),
			),
		)
		.orderBy(asc(davitem.id));
}

export async function criarDavItem(dados: NovoDavItem) {
	const [registro] = await db.insert(davitem).values(dados).returning();
	return registro;
}

export async function atualizarDavItem(
	id: string,
	dados: Partial<NovoDavItem>,
) {
	const [registro] = await db
		.update(davitem)
		.set(dados)
		.where(eq(davitem.id, id))
		.returning();

	return registro;
}

export async function excluirDavItem(id: string) {
	const [registro] = await db
		.delete(davitem)
		.where(eq(davitem.id, id))
		.returning();

	return registro;
}

export async function somarQuantidadesProvisionadasPorProdutos(params: {
	idempresa: string;
	idsProdutos?: string[] | undefined;
	ignorarIdDav?: string | undefined;
}): Promise<Record<string, number>> {
	if (params.idsProdutos && params.idsProdutos.length === 0) {
		return {};
	}

	const condicoes = [
		eq(dav.idempresa, params.idempresa),
		isNull(dav.idnotafiscal),
		isNull(dav.idnfce),
		or(isNull(dav.status), and(ne(dav.status, 3), ne(dav.status, 4))),
		or(isNull(davitem.cancelado), eq(davitem.cancelado, 0)),
		isNotNull(davitem.idproduto),
	];

	if (params.idsProdutos && params.idsProdutos.length > 0) {
		condicoes.push(inArray(davitem.idproduto, params.idsProdutos));
	}

	if (params.ignorarIdDav) {
		condicoes.push(ne(dav.id, params.ignorarIdDav));
	}

	const linhas = await db
		.select({
			idproduto: davitem.idproduto,
			quantidadeProvisionada: sql<string>`COALESCE(SUM(COALESCE(${davitem.quantidade}::numeric, 0)), 0)::text`,
		})
		.from(davitem)
		.innerJoin(dav, eq(davitem.iddav, dav.id))
		.where(and(...condicoes))
		.groupBy(davitem.idproduto);

	const resultado: Record<string, number> = {};
	for (const linha of linhas) {
		if (!linha.idproduto) continue;
		const valor = Number.parseFloat(linha.quantidadeProvisionada ?? "0");
		resultado[linha.idproduto] = Number.isFinite(valor) ? valor : 0;
	}
	return resultado;
}

export async function somarQuantidadeProvisionadaPorProduto(params: {
	idempresa: string;
	idproduto: string;
	ignorarIdDav?: string | undefined;
}): Promise<number> {
	const mapa = await somarQuantidadesProvisionadasPorProdutos({
		idempresa: params.idempresa,
		idsProdutos: [params.idproduto],
		ignorarIdDav: params.ignorarIdDav,
	});
	return mapa[params.idproduto] ?? 0;
}

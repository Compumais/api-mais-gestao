import { and, asc, eq } from "drizzle-orm";
import type { NovoAtalhoPdv } from "@/model/atalho-pdv-model.js";
import { atalhopdv, produtos } from "@/repositories/schema.js";
import { db } from "./connection";

export async function listarAtalhosPdvComProduto(
	idempresa: string,
	idusuario: string,
) {
	return db
		.select({
			idproduto: atalhopdv.idproduto,
			descricao: produtos.descricao,
			preco: produtos.preco,
			unidademedida: produtos.unidademedida,
			idunidademedida: produtos.idunidademedida,
			codigo: produtos.codigo,
			ordem: atalhopdv.ordem,
		})
		.from(atalhopdv)
		.innerJoin(produtos, eq(atalhopdv.idproduto, produtos.id))
		.where(
			and(eq(atalhopdv.idempresa, idempresa), eq(atalhopdv.idusuario, idusuario)),
		)
		.orderBy(asc(atalhopdv.ordem), asc(produtos.descricao));
}

export async function substituirAtalhosPdv(params: {
	idempresa: string;
	idusuario: string;
	atalhos: NovoAtalhoPdv[];
}) {
	const { idempresa, idusuario, atalhos } = params;

	return db.transaction(async (tx) => {
		await tx
			.delete(atalhopdv)
			.where(
				and(
					eq(atalhopdv.idempresa, idempresa),
					eq(atalhopdv.idusuario, idusuario),
				),
			);

		if (atalhos.length === 0) {
			return [];
		}

		return tx.insert(atalhopdv).values(atalhos).returning();
	});
}

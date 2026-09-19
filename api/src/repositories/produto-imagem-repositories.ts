import { and, asc, eq, max } from "drizzle-orm";
import { produtoimagem, produtos } from "@/repositories/schema.js";
import { db } from "./connection.js";

export type NovaImagemProduto = typeof produtoimagem.$inferInsert;
export type ImagemProduto = typeof produtoimagem.$inferSelect;

function referenciaPrincipal(
	idproduto: string,
	imagem: ImagemProduto | undefined,
): string | null {
	if (!imagem) return null;
	if (imagem.origem === "legada") {
		return imagem.referencia === "legado:imagem" ? null : imagem.referencia;
	}
	try {
		const token = new URL(imagem.referencia, "http://local").searchParams.get(
			"v",
		);
		return token ? `/produtos/${idproduto}/imagem?v=${token}` : null;
	} catch {
		return null;
	}
}

export async function listarImagensProduto(idproduto: string) {
	return db
		.select()
		.from(produtoimagem)
		.where(eq(produtoimagem.idproduto, idproduto))
		.orderBy(asc(produtoimagem.ordem), asc(produtoimagem.criadoem));
}

export async function buscarImagemProdutoPorId(
	idproduto: string,
	idimagem: string,
) {
	const [imagem] = await db
		.select()
		.from(produtoimagem)
		.where(
			and(
				eq(produtoimagem.id, idimagem),
				eq(produtoimagem.idproduto, idproduto),
			),
		)
		.limit(1);
	return imagem;
}

export async function proximaOrdemImagemProduto(idproduto: string) {
	const [resultado] = await db
		.select({ ordem: max(produtoimagem.ordem) })
		.from(produtoimagem)
		.where(eq(produtoimagem.idproduto, idproduto));
	return (resultado?.ordem ?? -1) + 1;
}

export async function criarImagemProduto(
	imagem: NovaImagemProduto,
	tornarPrincipal: boolean,
) {
	return db.transaction(async (tx) => {
		if (tornarPrincipal) {
			await tx
				.update(produtoimagem)
				.set({ principal: false, atualizadoem: new Date().toISOString() })
				.where(eq(produtoimagem.idproduto, imagem.idproduto));
		}
		const [criada] = await tx
			.insert(produtoimagem)
			.values({ ...imagem, principal: tornarPrincipal })
			.returning();
		if (!criada) return undefined;
		if (tornarPrincipal) {
			await tx
				.update(produtos)
				.set({
					caminhoimagem: referenciaPrincipal(imagem.idproduto, criada),
				})
				.where(eq(produtos.id, imagem.idproduto));
		}
		return criada;
	});
}

export async function definirImagemPrincipal(
	idproduto: string,
	idimagem: string,
) {
	return db.transaction(async (tx) => {
		const [imagem] = await tx
			.select()
			.from(produtoimagem)
			.where(
				and(
					eq(produtoimagem.id, idimagem),
					eq(produtoimagem.idproduto, idproduto),
				),
			)
			.limit(1);
		if (!imagem) return undefined;

		await tx
			.update(produtoimagem)
			.set({ principal: false, atualizadoem: new Date().toISOString() })
			.where(eq(produtoimagem.idproduto, idproduto));
		const [atualizada] = await tx
			.update(produtoimagem)
			.set({ principal: true, atualizadoem: new Date().toISOString() })
			.where(eq(produtoimagem.id, idimagem))
			.returning();
		await tx
			.update(produtos)
			.set({ caminhoimagem: referenciaPrincipal(idproduto, imagem) })
			.where(eq(produtos.id, idproduto));
		return atualizada;
	});
}

export async function excluirImagemProduto(
	idproduto: string,
	idimagem: string,
) {
	return db.transaction(async (tx) => {
		const [imagem] = await tx
			.select()
			.from(produtoimagem)
			.where(
				and(
					eq(produtoimagem.id, idimagem),
					eq(produtoimagem.idproduto, idproduto),
				),
			)
			.limit(1);
		if (!imagem) return undefined;
		await tx.delete(produtoimagem).where(eq(produtoimagem.id, idimagem));

		let novaPrincipal: ImagemProduto | undefined;
		if (imagem.principal) {
			[novaPrincipal] = await tx
				.select()
				.from(produtoimagem)
				.where(eq(produtoimagem.idproduto, idproduto))
				.orderBy(asc(produtoimagem.ordem), asc(produtoimagem.criadoem))
				.limit(1);
			if (novaPrincipal) {
				await tx
					.update(produtoimagem)
					.set({
						principal: true,
						atualizadoem: new Date().toISOString(),
					})
					.where(eq(produtoimagem.id, novaPrincipal.id));
			}
			await tx
				.update(produtos)
				.set({
					caminhoimagem: referenciaPrincipal(idproduto, novaPrincipal),
					...(imagem.origem === "legada" || !novaPrincipal
						? { imagem: null }
						: {}),
				})
				.where(eq(produtos.id, idproduto));
		} else if (imagem.origem === "legada") {
			await tx
				.update(produtos)
				.set({ imagem: null })
				.where(eq(produtos.id, idproduto));
		}
		return { removida: imagem, novaPrincipal };
	});
}

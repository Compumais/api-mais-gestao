import { and, asc, count, desc, eq, getTableColumns } from "drizzle-orm";
import type { NovoOrdemServicoItem } from "@/model/ordem-servico-item-model";
import { ordemservicoitem, produtos, usuarios } from "@/repositories/schema.js";
import { db } from "./connection";

export async function buscarOrdemServicoItemPorId(
	id: string,
	idempresa: string,
) {
	const [registro] = await db
		.select()
		.from(ordemservicoitem)
		.where(
			and(
				eq(ordemservicoitem.id, id),
				eq(ordemservicoitem.idempresa, idempresa),
			),
		);

	return registro;
}

export async function criarOrdemServicoItem(dados: NovoOrdemServicoItem) {
	const [registro] = await db
		.insert(ordemservicoitem)
		.values(dados)
		.returning();

	return registro;
}

export async function atualizarOrdemServicoItem(
	id: string,
	idempresa: string,
	dados: Partial<NovoOrdemServicoItem>,
) {
	const [registro] = await db
		.update(ordemservicoitem)
		.set({
			...dados,
			dataalteracao: new Date().toISOString(),
		})
		.where(
			and(
				eq(ordemservicoitem.id, id),
				eq(ordemservicoitem.idempresa, idempresa),
			),
		)
		.returning();

	return registro;
}

export async function excluirOrdemServicoItem(id: string, idempresa: string) {
	const [registro] = await db
		.delete(ordemservicoitem)
		.where(
			and(
				eq(ordemservicoitem.id, id),
				eq(ordemservicoitem.idempresa, idempresa),
			),
		)
		.returning();

	return registro;
}

export async function listarItensPorOrdemServico(
	idordemservico: string,
	idempresa: string,
) {
	const linhas = await db
		.select({
			...getTableColumns(ordemservicoitem),
			tipoproduto: produtos.tipo,
			nometecnico: usuarios.nome,
		})
		.from(ordemservicoitem)
		.leftJoin(produtos, eq(ordemservicoitem.idproduto, produtos.id))
		.leftJoin(usuarios, eq(ordemservicoitem.idtecnico, usuarios.id))
		.where(
			and(
				eq(ordemservicoitem.idordemservico, idordemservico),
				eq(ordemservicoitem.idempresa, idempresa),
			),
		)
		.orderBy(
			asc(ordemservicoitem.contador),
			desc(ordemservicoitem.datacriacao),
		);

	return linhas.map((linha) => ({
		...linha,
		tipoproduto: linha.tipoproduto ?? "P",
		nometecnico: linha.nometecnico ?? null,
	}));
}

export async function contarItensOrdemServico(
	idordemservico: string,
	idempresa: string,
) {
	const [resultado] = await db
		.select({ value: count() })
		.from(ordemservicoitem)
		.where(
			and(
				eq(ordemservicoitem.idordemservico, idordemservico),
				eq(ordemservicoitem.idempresa, idempresa),
			),
		);

	return resultado?.value ?? 0;
}

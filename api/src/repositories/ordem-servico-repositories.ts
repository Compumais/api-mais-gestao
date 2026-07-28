import { and, count, desc, eq, gte, ilike, lte, sql } from "drizzle-orm";
import type { NovoOrdemServico } from "@/model/ordem-servico-model";
import { ordemservico } from "@/repositories/schema.js";
import { db } from "./connection";

export async function buscarOrdemServicoPorId(id: string) {
	const [registro] = await db
		.select()
		.from(ordemservico)
		.where(eq(ordemservico.id, id));

	return registro;
}

export async function buscarOrdemServicoPorIdEempresa(
	id: string,
	idempresa: string,
) {
	const [registro] = await db
		.select()
		.from(ordemservico)
		.where(and(eq(ordemservico.id, id), eq(ordemservico.idempresa, idempresa)));

	return registro;
}

export async function criarOrdemServico(dadosOrdemServico: NovoOrdemServico) {
	const [registro] = await db
		.insert(ordemservico)
		.values(dadosOrdemServico)
		.returning();

	return registro;
}

export async function atualizarOrdemServico(
	id: string,
	idempresa: string,
	dadosOrdemServico: Partial<NovoOrdemServico>,
) {
	const [registro] = await db
		.update(ordemservico)
		.set({
			...dadosOrdemServico,
			currenttimemillis: Date.now(),
		})
		.where(and(eq(ordemservico.id, id), eq(ordemservico.idempresa, idempresa)))
		.returning();

	return registro;
}

export async function excluirOrdemServico(id: string, idempresa: string) {
	const [registro] = await db
		.delete(ordemservico)
		.where(and(eq(ordemservico.id, id), eq(ordemservico.idempresa, idempresa)))
		.returning();

	return registro;
}

export type ListarOrdensServicoParametros = {
	idempresa: string;
	page?: number;
	limit?: number;
	status?: number | undefined;
	idcliente?: string | undefined;
	idultimotecnico?: string | undefined;
	codigo?: number | undefined;
	orcamento?: number | undefined;
	dataInicio?: string | undefined;
	dataFim?: string | undefined;
	busca?: string | undefined;
};

export async function listarOrdensServico({
	idempresa,
	page = 1,
	limit = 10,
	status,
	idcliente,
	idultimotecnico,
	codigo,
	orcamento,
	dataInicio,
	dataFim,
	busca,
}: ListarOrdensServicoParametros) {
	const where = [eq(ordemservico.idempresa, idempresa)];

	if (status !== undefined) {
		where.push(eq(ordemservico.status, status));
	}
	if (idcliente) {
		where.push(eq(ordemservico.idcliente, idcliente));
	}
	if (idultimotecnico) {
		where.push(eq(ordemservico.idultimotecnico, idultimotecnico));
	}
	if (codigo !== undefined) {
		where.push(eq(ordemservico.codigo, codigo));
	}
	if (orcamento !== undefined) {
		where.push(eq(ordemservico.orcamento, orcamento));
	}
	if (dataInicio) {
		where.push(gte(ordemservico.dataos, dataInicio));
	}
	if (dataFim) {
		where.push(lte(ordemservico.dataos, dataFim));
	}
	if (busca) {
		where.push(ilike(ordemservico.nomecliente, `%${busca}%`));
	}

	const offset = (page - 1) * limit;

	const [totalCount, ordenservicos] = await Promise.all([
		db
			.select({ value: count() })
			.from(ordemservico)
			.where(and(...where)),
		db
			.select()
			.from(ordemservico)
			.where(and(...where))
			.orderBy(desc(ordemservico.currenttimemillis))
			.limit(limit)
			.offset(offset),
	]);

	return {
		ordenservicos,
		total: totalCount[0]?.value ?? 0,
	};
}

export async function recalcularTotaisOrdemServico(
	idordemservico: string,
	idempresa: string,
) {
	const result = await db.execute<{
		valorprodutos: string | null;
		valorservicos: string | null;
		valor: string | null;
	}>(sql`
		SELECT
			COALESCE(SUM(CASE WHEN p.tipo = 'S' THEN CAST(i.total AS numeric) ELSE 0 END), 0)::text AS valorservicos,
			COALESCE(SUM(CASE WHEN COALESCE(p.tipo, 'P') <> 'S' THEN CAST(i.total AS numeric) ELSE 0 END), 0)::text AS valorprodutos,
			COALESCE(SUM(CAST(i.total AS numeric)), 0)::text AS valor
		FROM ordemservicoitem i
		LEFT JOIN produtos p ON p.id = i.idproduto
		WHERE i.idordemservico = ${idordemservico}
			AND i.idempresa = ${idempresa}
			AND COALESCE(i.cancelado, 0) = 0
	`);

	const totais = result.rows[0];

	return atualizarOrdemServico(idordemservico, idempresa, {
		valorprodutos: totais?.valorprodutos ?? "0.00",
		valorservicos: totais?.valorservicos ?? "0.00",
		valor: totais?.valor ?? "0.00",
	});
}

import {
	and,
	asc,
	count,
	desc,
	eq,
	ilike,
	max,
	sql,
} from "drizzle-orm";
import type {
	NovaCotacaoCompra,
	NovaCotacaoCompraProposta,
	NovoCotacaoCompraItem,
	NovoCotacaoCompraPropostaItem,
} from "@/model/cotacao-compra-model.js";
import * as schema from "../../drizzle/schema.js";
import { db } from "./connection.js";

const camposItemEnriquecido = {
	id: schema.cotacaocompraitem.id,
	idcotacao: schema.cotacaocompraitem.idcotacao,
	idproduto: schema.cotacaocompraitem.idproduto,
	descricao: schema.cotacaocompraitem.descricao,
	quantidade: schema.cotacaocompraitem.quantidade,
	unidademedida: schema.cotacaocompraitem.unidademedida,
	observacao: schema.cotacaocompraitem.observacao,
	ordem: schema.cotacaocompraitem.ordem,
	codigoproduto: schema.produtos.codigo,
	nomeproduto: sql<string | null>`coalesce(${schema.cotacaocompraitem.descricao}, ${schema.produtos.descricao}, ${schema.produtos.nome})`,
	descricaoproduto: schema.produtos.descricao,
};

export async function buscarProximoCodigoCotacaoCompra(idempresa: string) {
	const [resultado] = await db
		.select({ value: max(schema.cotacaocompra.codigo) })
		.from(schema.cotacaocompra)
		.where(eq(schema.cotacaocompra.idempresa, idempresa));

	return (resultado?.value ?? 0) + 1;
}

export async function criarCotacaoCompraComItens(
	dados: NovaCotacaoCompra,
	itens: NovoCotacaoCompraItem[],
) {
	return db.transaction(async (tx) => {
		const [cotacao] = await tx
			.insert(schema.cotacaocompra)
			.values(dados)
			.returning();
		if (!cotacao) return null;

		const itensCriados =
			itens.length > 0
				? await tx.insert(schema.cotacaocompraitem).values(itens).returning()
				: [];

		return { cotacao, itens: itensCriados };
	});
}

export async function buscarCotacaoCompraPorId(id: string) {
	const [cotacao] = await db
		.select()
		.from(schema.cotacaocompra)
		.where(eq(schema.cotacaocompra.id, id));
	return cotacao;
}

export async function buscarCotacaoCompraPorToken(token: string) {
	const [cotacao] = await db
		.select()
		.from(schema.cotacaocompra)
		.where(eq(schema.cotacaocompra.tokenpublico, token));
	return cotacao;
}

export async function listarItensCotacaoCompraEnriquecidos(idcotacao: string) {
	return db
		.select(camposItemEnriquecido)
		.from(schema.cotacaocompraitem)
		.leftJoin(
			schema.produtos,
			eq(schema.cotacaocompraitem.idproduto, schema.produtos.id),
		)
		.where(eq(schema.cotacaocompraitem.idcotacao, idcotacao))
		.orderBy(asc(schema.cotacaocompraitem.ordem), asc(schema.cotacaocompraitem.id));
}

export async function contarPropostasCotacao(idcotacao: string) {
	const [resultado] = await db
		.select({ value: count() })
		.from(schema.cotacaocompraproposta)
		.where(eq(schema.cotacaocompraproposta.idcotacao, idcotacao));
	return resultado?.value ?? 0;
}

interface ListarCotacoesCompraParametros {
	idempresa: string;
	status?: string | undefined;
	q?: string | undefined;
	page?: number | undefined;
	limit?: number | undefined;
}

export async function listarCotacoesCompra({
	idempresa,
	status,
	q,
	page = 1,
	limit = 10,
}: ListarCotacoesCompraParametros) {
	const where = [eq(schema.cotacaocompra.idempresa, idempresa)];

	if (status) {
		where.push(eq(schema.cotacaocompra.status, status));
	}

	if (q && q.trim() !== "") {
		const termo = `%${q.trim()}%`;
		where.push(ilike(schema.cotacaocompra.titulo, termo));
	}

	const offset = (page - 1) * limit;

	const [totalCount, cotacoes] = await Promise.all([
		db
			.select({ value: count() })
			.from(schema.cotacaocompra)
			.where(and(...where)),
		db
			.select({
				id: schema.cotacaocompra.id,
				idempresa: schema.cotacaocompra.idempresa,
				codigo: schema.cotacaocompra.codigo,
				titulo: schema.cotacaocompra.titulo,
				observacao: schema.cotacaocompra.observacao,
				status: schema.cotacaocompra.status,
				tokenpublico: schema.cotacaocompra.tokenpublico,
				validade: schema.cotacaocompra.validade,
				currenttimemillis: schema.cotacaocompra.currenttimemillis,
				totalpropostas: sql<number>`coalesce((
					select count(*)::int
					from ${schema.cotacaocompraproposta}
					where ${schema.cotacaocompraproposta.idcotacao} = ${schema.cotacaocompra.id}
				), 0)`,
			})
			.from(schema.cotacaocompra)
			.where(and(...where))
			.orderBy(desc(schema.cotacaocompra.codigo))
			.limit(limit)
			.offset(offset),
	]);

	return {
		cotacoes,
		total: totalCount[0]?.value ?? 0,
	};
}

export async function atualizarCotacaoCompra(
	id: string,
	dados: Partial<NovaCotacaoCompra>,
) {
	const [cotacao] = await db
		.update(schema.cotacaocompra)
		.set(dados)
		.where(eq(schema.cotacaocompra.id, id))
		.returning();
	return cotacao;
}

export async function substituirItensCotacaoCompra(
	idcotacao: string,
	itens: NovoCotacaoCompraItem[],
) {
	return db.transaction(async (tx) => {
		await tx
			.delete(schema.cotacaocompraitem)
			.where(eq(schema.cotacaocompraitem.idcotacao, idcotacao));

		if (itens.length === 0) return [];

		return tx.insert(schema.cotacaocompraitem).values(itens).returning();
	});
}

export async function excluirCotacaoCompra(id: string) {
	const [cotacao] = await db
		.delete(schema.cotacaocompra)
		.where(eq(schema.cotacaocompra.id, id))
		.returning();
	return cotacao;
}

export async function buscarPropostaPorCotacaoETelefone(
	idcotacao: string,
	telefone: string,
) {
	const [proposta] = await db
		.select()
		.from(schema.cotacaocompraproposta)
		.where(
			and(
				eq(schema.cotacaocompraproposta.idcotacao, idcotacao),
				eq(schema.cotacaocompraproposta.telefone, telefone),
			),
		);
	return proposta;
}

export async function buscarPropostaPorId(id: string) {
	const [proposta] = await db
		.select()
		.from(schema.cotacaocompraproposta)
		.where(eq(schema.cotacaocompraproposta.id, id));
	return proposta;
}

export async function listarPropostasCotacao(idcotacao: string) {
	return db
		.select()
		.from(schema.cotacaocompraproposta)
		.where(eq(schema.cotacaocompraproposta.idcotacao, idcotacao))
		.orderBy(asc(schema.cotacaocompraproposta.nome));
}

export async function listarItensPropostasCotacao(idcotacao: string) {
	return db
		.select({
			id: schema.cotacaocomprapropostaitem.id,
			idproposta: schema.cotacaocomprapropostaitem.idproposta,
			idcotacaoitem: schema.cotacaocomprapropostaitem.idcotacaoitem,
			precounitario: schema.cotacaocomprapropostaitem.precounitario,
		})
		.from(schema.cotacaocomprapropostaitem)
		.innerJoin(
			schema.cotacaocompraproposta,
			eq(
				schema.cotacaocomprapropostaitem.idproposta,
				schema.cotacaocompraproposta.id,
			),
		)
		.where(eq(schema.cotacaocompraproposta.idcotacao, idcotacao));
}

export async function upsertPropostaCotacao(
	dados: NovaCotacaoCompraProposta,
	itens: NovoCotacaoCompraPropostaItem[],
	propostaExistenteId?: string,
) {
	return db.transaction(async (tx) => {
		let propostaId = propostaExistenteId;

		if (propostaId) {
			await tx
				.update(schema.cotacaocompraproposta)
				.set({
					nome: dados.nome,
					telefone: dados.telefone,
					currenttimemillis: dados.currenttimemillis,
				})
				.where(eq(schema.cotacaocompraproposta.id, propostaId));

			await tx
				.delete(schema.cotacaocomprapropostaitem)
				.where(eq(schema.cotacaocomprapropostaitem.idproposta, propostaId));
		} else {
			const [criada] = await tx
				.insert(schema.cotacaocompraproposta)
				.values(dados)
				.returning();
			if (!criada) return null;
			propostaId = criada.id;
		}

		const itensComProposta = itens.map((item) => ({
			...item,
			idproposta: propostaId!,
		}));

		if (itensComProposta.length > 0) {
			await tx
				.insert(schema.cotacaocomprapropostaitem)
				.values(itensComProposta);
		}

		const [proposta] = await tx
			.select()
			.from(schema.cotacaocompraproposta)
			.where(eq(schema.cotacaocompraproposta.id, propostaId));

		return proposta;
	});
}

export async function contarPedidosPorCotacao(idcotacao: string) {
	const [resultado] = await db
		.select({ value: count() })
		.from(schema.pedidocompra)
		.where(eq(schema.pedidocompra.idcotacao, idcotacao));
	return resultado?.value ?? 0;
}

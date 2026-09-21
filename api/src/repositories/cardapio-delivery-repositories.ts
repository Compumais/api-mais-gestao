import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import type {
	NovoCardapioDelivery,
	NovoPedidoCardapioDelivery,
} from "@/model/cardapio-delivery-model.js";
import {
	cardapiodelivery,
	grupogourmet,
	pedidocardapiodelivery,
	produtos,
} from "@/repositories/schema.js";
import { filtroRegistroAtivo } from "@/util/filtro-registro-ativo.js";
import { db } from "./connection";

export async function buscarCardapioDeliveryPorEmpresa(idempresa: string) {
	const [registro] = await db
		.select()
		.from(cardapiodelivery)
		.where(eq(cardapiodelivery.idempresa, idempresa));
	return registro;
}

export async function buscarCardapioDeliveryPorSlug(slug: string) {
	const [registro] = await db
		.select()
		.from(cardapiodelivery)
		.where(eq(cardapiodelivery.slug, slug));
	return registro;
}

export async function buscarCardapioDeliveryPorId(id: string) {
	const [registro] = await db
		.select()
		.from(cardapiodelivery)
		.where(eq(cardapiodelivery.id, id));
	return registro;
}

export async function slugCardapioEmUso(
	slug: string,
	excetoId?: string | undefined,
) {
	const where = [eq(cardapiodelivery.slug, slug)];
	if (excetoId) {
		where.push(sql`${cardapiodelivery.id} <> ${excetoId}`);
	}
	const [resultado] = await db
		.select({ value: sql<number>`count(*)` })
		.from(cardapiodelivery)
		.where(and(...where));
	return Number(resultado?.value ?? 0) > 0;
}

export async function criarCardapioDelivery(dados: NovoCardapioDelivery) {
	const [registro] = await db
		.insert(cardapiodelivery)
		.values(dados)
		.returning();
	return registro;
}

export async function atualizarCardapioDelivery(
	id: string,
	dados: Partial<NovoCardapioDelivery>,
) {
	const [registro] = await db
		.update(cardapiodelivery)
		.set(dados)
		.where(eq(cardapiodelivery.id, id))
		.returning();
	return registro;
}

export async function criarPedidoCardapioDelivery(
	dados: NovoPedidoCardapioDelivery,
) {
	const [registro] = await db
		.insert(pedidocardapiodelivery)
		.values(dados)
		.returning();
	return registro;
}

export async function buscarPedidoCardapioPorClientOrderId(
	idempresa: string,
	clientorderid: string,
) {
	const [registro] = await db
		.select()
		.from(pedidocardapiodelivery)
		.where(
			and(
				eq(pedidocardapiodelivery.idempresa, idempresa),
				eq(pedidocardapiodelivery.clientorderid, clientorderid),
			),
		);
	return registro;
}

export async function buscarPedidoCardapioPorProtocolo(protocolo: string) {
	const [registro] = await db
		.select()
		.from(pedidocardapiodelivery)
		.where(eq(pedidocardapiodelivery.protocolo, protocolo));
	return registro;
}

export async function buscarPedidoCardapioPorId(id: string) {
	const [registro] = await db
		.select()
		.from(pedidocardapiodelivery)
		.where(eq(pedidocardapiodelivery.id, id));
	return registro;
}

export async function listarPedidosCardapioPendentes(
	idempresa: string,
	limit = 20,
) {
	return db
		.select()
		.from(pedidocardapiodelivery)
		.where(
			and(
				eq(pedidocardapiodelivery.idempresa, idempresa),
				eq(pedidocardapiodelivery.status, "pendente"),
			),
		)
		.orderBy(pedidocardapiodelivery.criadoem)
		.limit(limit);
}

export async function atualizarPedidoCardapioDelivery(
	id: string,
	dados: Partial<NovoPedidoCardapioDelivery>,
) {
	const [registro] = await db
		.update(pedidocardapiodelivery)
		.set(dados)
		.where(eq(pedidocardapiodelivery.id, id))
		.returning();
	return registro;
}

export type ProdutoCardapioPublico = {
	id: string;
	descricao: string;
	observacoes: string | null;
	preco: string | null;
	espizza: number | null;
	idgrupogourmet: string;
	gruponome: string;
	temimagem: boolean;
};

export async function listarProdutosCardapioPublico(idempresa: string) {
	const filtroProdutoAtivo = filtroRegistroAtivo(produtos.inativo, 0);
	const filtroGrupoAtivo = filtroRegistroAtivo(grupogourmet.inativo, 0);
	const condicoes = [
		eq(produtos.idempresa, idempresa),
		eq(produtos.exibircardapiodelivery, 1),
		isNotNull(produtos.idgrupogourmet),
		eq(grupogourmet.idempresa, idempresa),
	];
	if (filtroProdutoAtivo) condicoes.push(filtroProdutoAtivo);
	if (filtroGrupoAtivo) condicoes.push(filtroGrupoAtivo);

	const rows = await db
		.select({
			id: produtos.id,
			descricao: produtos.descricao,
			nome: produtos.nome,
			observacoes: produtos.observacoes,
			preco: produtos.preco,
			espizza: produtos.espizza,
			idgrupogourmet: produtos.idgrupogourmet,
			gruponome: grupogourmet.nome,
			caminhoimagem: produtos.caminhoimagem,
		})
		.from(produtos)
		.innerJoin(grupogourmet, eq(produtos.idgrupogourmet, grupogourmet.id))
		.where(and(...condicoes))
		.orderBy(grupogourmet.nome, produtos.descricao);

	return rows
		.filter(
			(row): row is typeof row & { idgrupogourmet: string } =>
				Boolean(row.idgrupogourmet),
		)
		.map((row) => ({
			id: row.id,
			descricao: row.descricao || row.nome || "",
			observacoes: row.observacoes,
			preco: row.preco,
			espizza: row.espizza,
			idgrupogourmet: row.idgrupogourmet,
			gruponome: row.gruponome,
			temimagem: Boolean(row.caminhoimagem),
		})) satisfies ProdutoCardapioPublico[];
}

export async function buscarProdutosCardapioPorIds(
	idempresa: string,
	ids: string[],
) {
	if (ids.length === 0) return [];
	const filtroAtivo = filtroRegistroAtivo(produtos.inativo, 0);
	const condicoes = [
		eq(produtos.idempresa, idempresa),
		inArray(produtos.id, ids),
		eq(produtos.exibircardapiodelivery, 1),
		isNotNull(produtos.idgrupogourmet),
	];
	if (filtroAtivo) condicoes.push(filtroAtivo);
	return db
		.select({
			id: produtos.id,
			descricao: produtos.descricao,
			nome: produtos.nome,
			preco: produtos.preco,
			espizza: produtos.espizza,
			idgrupogourmet: produtos.idgrupogourmet,
			codigo: produtos.codigo,
			ean: produtos.ean,
		})
		.from(produtos)
		.where(and(...condicoes));
}

export async function listarGruposGourmetCardapio(idempresa: string) {
	const filtroAtivo = filtroRegistroAtivo(grupogourmet.inativo, 0);
	const condicoes = [eq(grupogourmet.idempresa, idempresa)];
	if (filtroAtivo) condicoes.push(filtroAtivo);
	return db
		.select({
			id: grupogourmet.id,
			nome: grupogourmet.nome,
			caminhoimagem: grupogourmet.caminhoimagem,
		})
		.from(grupogourmet)
		.where(and(...condicoes))
		.orderBy(grupogourmet.nome);
}

export async function protocoloCardapioExiste(protocolo: string) {
	const [resultado] = await db
		.select({ value: sql<number>`count(*)` })
		.from(pedidocardapiodelivery)
		.where(eq(pedidocardapiodelivery.protocolo, protocolo));
	return Number(resultado?.value ?? 0) > 0;
}

export async function listarPedidosCardapioRecentes(
	idempresa: string,
	limit = 5,
) {
	return db
		.select()
		.from(pedidocardapiodelivery)
		.where(eq(pedidocardapiodelivery.idempresa, idempresa))
		.orderBy(desc(pedidocardapiodelivery.criadoem))
		.limit(limit);
}

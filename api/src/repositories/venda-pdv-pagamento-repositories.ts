import { asc, eq, inArray } from "drizzle-orm";
import type { NovoVendaPdvPagamento } from "@/model/venda-pdv-pagamento-model.js";
import { vendapdvpagamento } from "@/repositories/schema.js";
import { db } from "./connection";

export async function criarVendaPdvPagamentos(
	pagamentos: NovoVendaPdvPagamento[],
) {
	if (!pagamentos.length) {
		return [];
	}

	return db.insert(vendapdvpagamento).values(pagamentos).returning();
}

export async function listarVendaPdvPagamentosPorVenda(idvenda: string) {
	return db
		.select()
		.from(vendapdvpagamento)
		.where(eq(vendapdvpagamento.idvenda, idvenda))
		.orderBy(asc(vendapdvpagamento.criadoem));
}

export async function listarVendaPdvPagamentosPorVendas(idsVenda: string[]) {
	if (idsVenda.length === 0) {
		return [];
	}
	return db
		.select()
		.from(vendapdvpagamento)
		.where(inArray(vendapdvpagamento.idvenda, idsVenda))
		.orderBy(asc(vendapdvpagamento.criadoem));
}

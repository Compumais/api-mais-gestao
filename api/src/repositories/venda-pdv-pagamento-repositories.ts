import { asc, eq } from "drizzle-orm";
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

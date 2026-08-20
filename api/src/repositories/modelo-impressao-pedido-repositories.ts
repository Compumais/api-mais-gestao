import { and, count, desc, eq } from "drizzle-orm";
import type { NovoModeloImpressaoPedido } from "@/model/modelo-impressao-pedido-model.js";
import * as schema from "@/repositories/schema.js";
import { db } from "./connection.js";

export async function criarModeloImpressaoPedido(
	dados: NovoModeloImpressaoPedido,
) {
	const [registro] = await db
		.insert(schema.modeloimpressaopedido)
		.values(dados)
		.returning();
	return registro;
}

export async function buscarModeloImpressaoPedidoPorId(id: string) {
	const [registro] = await db
		.select()
		.from(schema.modeloimpressaopedido)
		.where(eq(schema.modeloimpressaopedido.id, id));
	return registro;
}

export async function listarModelosImpressaoPedido(idempresa: string) {
	return db
		.select()
		.from(schema.modeloimpressaopedido)
		.where(eq(schema.modeloimpressaopedido.idempresa, idempresa))
		.orderBy(
			desc(schema.modeloimpressaopedido.primario),
			desc(schema.modeloimpressaopedido.datainclusao),
		);
}

export async function contarModelosImpressaoPedido(idempresa: string) {
	const [resultado] = await db
		.select({ value: count() })
		.from(schema.modeloimpressaopedido)
		.where(eq(schema.modeloimpressaopedido.idempresa, idempresa));
	return resultado?.value ?? 0;
}

export async function atualizarModeloImpressaoPedido(
	id: string,
	dados: Partial<NovoModeloImpressaoPedido>,
) {
	const [registro] = await db
		.update(schema.modeloimpressaopedido)
		.set({
			...dados,
			atualizadoem: new Date().toISOString(),
		})
		.where(eq(schema.modeloimpressaopedido.id, id))
		.returning();
	return registro;
}

export async function excluirModeloImpressaoPedido(id: string) {
	const [registro] = await db
		.delete(schema.modeloimpressaopedido)
		.where(eq(schema.modeloimpressaopedido.id, id))
		.returning();
	return registro;
}

export async function limparPrimarioModelosImpressaoPedido(idempresa: string) {
	await db
		.update(schema.modeloimpressaopedido)
		.set({ primario: false, atualizadoem: new Date().toISOString() })
		.where(
			and(
				eq(schema.modeloimpressaopedido.idempresa, idempresa),
				eq(schema.modeloimpressaopedido.primario, true),
			),
		);
}

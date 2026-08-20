import { and, count, desc, eq } from "drizzle-orm";
import type { NovoModeloImpressaoOrdemServico } from "@/model/modelo-impressao-ordem-servico-model.js";
import * as schema from "@/repositories/schema.js";
import { db } from "./connection.js";

export async function criarModeloImpressaoOs(
	dados: NovoModeloImpressaoOrdemServico,
) {
	const [registro] = await db
		.insert(schema.modeloimpressaoordemservico)
		.values(dados)
		.returning();
	return registro;
}

export async function buscarModeloImpressaoOsPorId(id: string) {
	const [registro] = await db
		.select()
		.from(schema.modeloimpressaoordemservico)
		.where(eq(schema.modeloimpressaoordemservico.id, id));
	return registro;
}

export async function listarModelosImpressaoOs(idempresa: string) {
	return db
		.select()
		.from(schema.modeloimpressaoordemservico)
		.where(eq(schema.modeloimpressaoordemservico.idempresa, idempresa))
		.orderBy(
			desc(schema.modeloimpressaoordemservico.primario),
			desc(schema.modeloimpressaoordemservico.datainclusao),
		);
}

export async function contarModelosImpressaoOs(idempresa: string) {
	const [resultado] = await db
		.select({ value: count() })
		.from(schema.modeloimpressaoordemservico)
		.where(eq(schema.modeloimpressaoordemservico.idempresa, idempresa));
	return resultado?.value ?? 0;
}

export async function atualizarModeloImpressaoOs(
	id: string,
	dados: Partial<NovoModeloImpressaoOrdemServico>,
) {
	const [registro] = await db
		.update(schema.modeloimpressaoordemservico)
		.set({
			...dados,
			atualizadoem: new Date().toISOString(),
		})
		.where(eq(schema.modeloimpressaoordemservico.id, id))
		.returning();
	return registro;
}

export async function excluirModeloImpressaoOs(id: string) {
	const [registro] = await db
		.delete(schema.modeloimpressaoordemservico)
		.where(eq(schema.modeloimpressaoordemservico.id, id))
		.returning();
	return registro;
}

export async function limparPrimarioModelosImpressaoOs(idempresa: string) {
	await db
		.update(schema.modeloimpressaoordemservico)
		.set({ primario: false, atualizadoem: new Date().toISOString() })
		.where(
			and(
				eq(schema.modeloimpressaoordemservico.idempresa, idempresa),
				eq(schema.modeloimpressaoordemservico.primario, true),
			),
		);
}

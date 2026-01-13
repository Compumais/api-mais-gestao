import { eq } from "drizzle-orm";
import type { NovaContaCorrenteLancamento } from "@/model/conta-corrente-lancamento-model";
import * as schema from "../../drizzle/schema.js";
import { db } from "./connection";

export async function criarContaCorrenteLancamento(
	dados: NovaContaCorrenteLancamento,
) {
	const [contaCorrenteLancamento] = await db
		.insert(schema.contacorrentelancamento)
		.values(dados)
		.returning();

	return contaCorrenteLancamento;
}

export async function buscarContaCorrenteLancamentoPorId({
	id,
}: {
	id: string;
}) {
	const [contaCorrenteLancamento] = await db
		.select()
		.from(schema.contacorrentelancamento)
		.where(eq(schema.contacorrentelancamento.id, id));

	return contaCorrenteLancamento;
}

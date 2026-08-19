import { eq } from "drizzle-orm";
import type {
	DominioIntegracao,
	NovaDominioIntegracao,
} from "@/model/dominio-model.js";
import * as schema from "../../drizzle/schema.js";
import { db } from "./connection.js";

export type { DominioIntegracao, NovaDominioIntegracao };

export async function buscarDominioIntegracaoPorEmpresa(idempresa: string) {
	const [registro] = await db
		.select()
		.from(schema.dominiointegracao)
		.where(eq(schema.dominiointegracao.idempresa, idempresa));

	return registro;
}

export async function criarDominioIntegracao(dados: NovaDominioIntegracao) {
	const [registro] = await db
		.insert(schema.dominiointegracao)
		.values(dados)
		.returning();

	return registro;
}

export async function atualizarDominioIntegracao(
	id: string,
	dados: Partial<NovaDominioIntegracao>,
) {
	const [registro] = await db
		.update(schema.dominiointegracao)
		.set(dados)
		.where(eq(schema.dominiointegracao.id, id))
		.returning();

	return registro;
}

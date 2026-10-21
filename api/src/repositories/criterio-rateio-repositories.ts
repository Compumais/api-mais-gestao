import { and, desc, eq } from "drizzle-orm";
import type {
	CriterioRateio,
	NovoCriterioRateio,
	NovaCriterioRateioLinha,
} from "@/model/criterio-rateio-model.js";
import * as schema from "../../drizzle/schema.js";
import { db } from "./connection.js";

export async function criarCriterioRateio(dados: NovoCriterioRateio) {
	const [registro] = await db
		.insert(schema.criteriorateio)
		.values(dados)
		.returning();
	return registro;
}

export async function buscarCriterioRateioPorId(id: string) {
	const [registro] = await db
		.select()
		.from(schema.criteriorateio)
		.where(eq(schema.criteriorateio.id, id));
	return registro;
}

export async function listarCriteriosRateio({
	idempresa,
	ativo,
}: {
	idempresa: string;
	ativo?: number;
}) {
	const where = [eq(schema.criteriorateio.idempresa, idempresa)];
	if (ativo !== undefined) {
		where.push(eq(schema.criteriorateio.ativo, ativo));
	}
	return db
		.select()
		.from(schema.criteriorateio)
		.where(and(...where))
		.orderBy(desc(schema.criteriorateio.nome));
}

export async function atualizarCriterioRateio(
	id: string,
	dados: Partial<NovoCriterioRateio>,
) {
	const [registro] = await db
		.update(schema.criteriorateio)
		.set(dados)
		.where(eq(schema.criteriorateio.id, id))
		.returning();
	return registro;
}

export async function excluirCriterioRateio(id: string) {
	const [registro] = await db
		.delete(schema.criteriorateio)
		.where(eq(schema.criteriorateio.id, id))
		.returning();
	return registro;
}

export async function listarLinhasCriterioRateio(idcriteriorateio: string) {
	return db
		.select()
		.from(schema.criteriorateiolinha)
		.where(eq(schema.criteriorateiolinha.idcriteriorateio, idcriteriorateio))
		.orderBy(schema.criteriorateiolinha.ordem);
}

export async function substituirLinhasCriterioRateio(
	idempresa: string,
	idcriteriorateio: string,
	linhas: NovaCriterioRateioLinha[],
) {
	await db
		.delete(schema.criteriorateiolinha)
		.where(eq(schema.criteriorateiolinha.idcriteriorateio, idcriteriorateio));
	if (!linhas.length) return [];
	return db.insert(schema.criteriorateiolinha).values(linhas).returning();
}

export async function buscarCriterioRateioCompleto(id: string) {
	const criterio = await buscarCriterioRateioPorId(id);
	if (!criterio) return null;
	const linhas = await listarLinhasCriterioRateio(id);
	return { ...criterio, linhas } satisfies CriterioRateio & {
		linhas: Awaited<ReturnType<typeof listarLinhasCriterioRateio>>;
	};
}

import { and, eq } from "drizzle-orm";
import { nfeserie } from "@/repositories/schema.js";
import { db } from "./connection";

export type NfeSerie = typeof nfeserie.$inferSelect;
export type NovaNfeSerie = typeof nfeserie.$inferInsert;

export async function listarNfeSeriesPorEmpresa(idempresa: string) {
	return db
		.select()
		.from(nfeserie)
		.where(eq(nfeserie.idempresa, idempresa));
}

export async function buscarNfeSeriePorId(id: string) {
	const [registro] = await db
		.select()
		.from(nfeserie)
		.where(eq(nfeserie.id, id));

	return registro;
}

export async function buscarNfeSeriePadrao(idempresa: string, modelo = "55") {
	const [registro] = await db
		.select()
		.from(nfeserie)
		.where(
			and(
				eq(nfeserie.idempresa, idempresa),
				eq(nfeserie.modelo, modelo),
				eq(nfeserie.padrao, true),
				eq(nfeserie.ativo, true),
			),
		);

	return registro;
}

export async function criarNfeSerie(dados: NovaNfeSerie) {
	const [registro] = await db.insert(nfeserie).values(dados).returning();
	return registro;
}

export async function atualizarNfeSerie(id: string, dados: Partial<NovaNfeSerie>) {
	const [registro] = await db
		.update(nfeserie)
		.set(dados)
		.where(eq(nfeserie.id, id))
		.returning();

	return registro;
}

export async function desmarcarSeriesPadrao(idempresa: string, modelo: string) {
	await db
		.update(nfeserie)
		.set({ padrao: false, atualizadoem: new Date().toISOString() })
		.where(
			and(eq(nfeserie.idempresa, idempresa), eq(nfeserie.modelo, modelo)),
		);
}

export async function buscarNfeSeriePorNumeroSerie(
	idempresa: string,
	modelo: string,
	serie: string,
) {
	const [registro] = await db
		.select()
		.from(nfeserie)
		.where(
			and(
				eq(nfeserie.idempresa, idempresa),
				eq(nfeserie.modelo, modelo),
				eq(nfeserie.serie, serie),
			),
		)
		.limit(1);

	return registro;
}

export async function reservarProximoNumeroSerie(id: string) {
	return db.transaction(async (tx) => {
		const [serie] = await tx
			.select()
			.from(nfeserie)
			.where(eq(nfeserie.id, id))
			.for("update");

		if (!serie) {
			return null;
		}

		const numeroReservado = serie.numeroproximo;

		await tx
			.update(nfeserie)
			.set({
				numeroproximo: numeroReservado + 1,
				atualizadoem: new Date().toISOString(),
			})
			.where(eq(nfeserie.id, id));

		return { ...serie, numeroReservado };
	});
}

export async function buscarNfeSerieDuplicada(
	idempresa: string,
	modelo: string,
	serie: string,
	excluirId?: string,
) {
	const where = [
		eq(nfeserie.idempresa, idempresa),
		eq(nfeserie.modelo, modelo),
		eq(nfeserie.serie, serie),
	];

	const [registro] = await db
		.select()
		.from(nfeserie)
		.where(and(...where))
		.limit(1);

	if (!registro) return undefined;
	if (excluirId && registro.id === excluirId) return undefined;

	return registro;
}

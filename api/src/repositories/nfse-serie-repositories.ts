import { and, desc, eq } from "drizzle-orm";
import { nfseserie } from "@/repositories/schema.js";
import { db } from "./connection";

export type NfseSerie = typeof nfseserie.$inferSelect;
export type NovaNfseSerie = typeof nfseserie.$inferInsert;

export async function buscarNfseSeriePorId(id: string) {
	const [registro] = await db
		.select()
		.from(nfseserie)
		.where(eq(nfseserie.id, id));

	return registro;
}

export async function buscarNfseSeriePadrao(idempresa: string) {
	const [registro] = await db
		.select()
		.from(nfseserie)
		.where(
			and(
				eq(nfseserie.idempresa, idempresa),
				eq(nfseserie.padrao, true),
				eq(nfseserie.ativo, true),
			),
		)
		.orderBy(desc(nfseserie.criadoem))
		.limit(1);

	return registro;
}

export async function buscarNfseSeriePorNumeroSerie(
	idempresa: string,
	serie: string,
) {
	const [registro] = await db
		.select()
		.from(nfseserie)
		.where(and(eq(nfseserie.idempresa, idempresa), eq(nfseserie.serie, serie)));

	return registro;
}

export async function listarNfseSeriesPorEmpresa(idempresa: string) {
	return db
		.select()
		.from(nfseserie)
		.where(eq(nfseserie.idempresa, idempresa))
		.orderBy(desc(nfseserie.padrao), desc(nfseserie.criadoem));
}

export async function reservarProximoNumeroSerieNfse(idserie: string) {
	return db.transaction(async (tx) => {
		const [serieAtual] = await tx
			.select()
			.from(nfseserie)
			.where(eq(nfseserie.id, idserie))
			.for("update");

		if (!serieAtual) {
			return null;
		}

		const numeroReservado = serieAtual.numeroproximo;

		await tx
			.update(nfseserie)
			.set({
				numeroproximo: numeroReservado + 1,
				atualizadoem: new Date().toISOString(),
			})
			.where(eq(nfseserie.id, idserie));

		return {
			numeroRps: numeroReservado,
			serie: serieAtual.serie,
			idserie: serieAtual.id,
		};
	});
}

export async function criarNfseSerie(dados: NovaNfseSerie) {
	const [registro] = await db.insert(nfseserie).values(dados).returning();
	return registro;
}

export async function atualizarNfseSerie(
	id: string,
	dados: Partial<NovaNfseSerie>,
) {
	const [registro] = await db
		.update(nfseserie)
		.set(dados)
		.where(eq(nfseserie.id, id))
		.returning();

	return registro;
}

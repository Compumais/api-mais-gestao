import { and, asc, eq } from "drizzle-orm";
import { nfeserie, terminalpdv } from "@/repositories/schema.js";
import { db } from "./connection";

export type TerminalPdv = typeof terminalpdv.$inferSelect;
export type NovoTerminalPdv = typeof terminalpdv.$inferInsert;

export type TerminalPdvComSerie = TerminalPdv & {
	serie: string;
	numeroproximo: number;
	modeloserie: string;
	serieativa: boolean;
};

export async function listarTerminaisPdvPorEmpresa(idempresa: string) {
	return db
		.select({
			id: terminalpdv.id,
			idempresa: terminalpdv.idempresa,
			numeropdv: terminalpdv.numeropdv,
			descricao: terminalpdv.descricao,
			idnfeserie: terminalpdv.idnfeserie,
			ativo: terminalpdv.ativo,
			criadoem: terminalpdv.criadoem,
			atualizadoem: terminalpdv.atualizadoem,
			serie: nfeserie.serie,
			numeroproximo: nfeserie.numeroproximo,
			modeloserie: nfeserie.modelo,
			serieativa: nfeserie.ativo,
		})
		.from(terminalpdv)
		.innerJoin(nfeserie, eq(terminalpdv.idnfeserie, nfeserie.id))
		.where(eq(terminalpdv.idempresa, idempresa))
		.orderBy(asc(terminalpdv.numeropdv));
}

export async function buscarTerminalPdvPorId(id: string) {
	const [registro] = await db
		.select({
			id: terminalpdv.id,
			idempresa: terminalpdv.idempresa,
			numeropdv: terminalpdv.numeropdv,
			descricao: terminalpdv.descricao,
			idnfeserie: terminalpdv.idnfeserie,
			ativo: terminalpdv.ativo,
			criadoem: terminalpdv.criadoem,
			atualizadoem: terminalpdv.atualizadoem,
			serie: nfeserie.serie,
			numeroproximo: nfeserie.numeroproximo,
			modeloserie: nfeserie.modelo,
			serieativa: nfeserie.ativo,
		})
		.from(terminalpdv)
		.innerJoin(nfeserie, eq(terminalpdv.idnfeserie, nfeserie.id))
		.where(eq(terminalpdv.id, id));

	return registro;
}

export async function buscarTerminalPdvPorNumero(
	idempresa: string,
	numeropdv: number,
) {
	const [registro] = await db
		.select({
			id: terminalpdv.id,
			idempresa: terminalpdv.idempresa,
			numeropdv: terminalpdv.numeropdv,
			descricao: terminalpdv.descricao,
			idnfeserie: terminalpdv.idnfeserie,
			ativo: terminalpdv.ativo,
			criadoem: terminalpdv.criadoem,
			atualizadoem: terminalpdv.atualizadoem,
			serie: nfeserie.serie,
			numeroproximo: nfeserie.numeroproximo,
			modeloserie: nfeserie.modelo,
			serieativa: nfeserie.ativo,
		})
		.from(terminalpdv)
		.innerJoin(nfeserie, eq(terminalpdv.idnfeserie, nfeserie.id))
		.where(
			and(
				eq(terminalpdv.idempresa, idempresa),
				eq(terminalpdv.numeropdv, numeropdv),
			),
		);

	return registro;
}

export async function buscarTerminalPdvAtivoPorNumero(
	idempresa: string,
	numeropdv: number,
) {
	const registro = await buscarTerminalPdvPorNumero(idempresa, numeropdv);
	if (!registro?.ativo || !registro.serieativa) {
		return undefined;
	}
	return registro;
}

export async function buscarTerminalPdvPorSerie(idnfeserie: string) {
	const [registro] = await db
		.select()
		.from(terminalpdv)
		.where(eq(terminalpdv.idnfeserie, idnfeserie));

	return registro;
}

export async function criarTerminalPdv(dados: NovoTerminalPdv) {
	const [registro] = await db.insert(terminalpdv).values(dados).returning();
	return registro;
}

export async function atualizarTerminalPdv(
	id: string,
	dados: Partial<NovoTerminalPdv>,
) {
	const [registro] = await db
		.update(terminalpdv)
		.set(dados)
		.where(eq(terminalpdv.id, id))
		.returning();

	return registro;
}

export async function excluirTerminalPdv(id: string) {
	const [registro] = await db
		.delete(terminalpdv)
		.where(eq(terminalpdv.id, id))
		.returning();

	return registro;
}

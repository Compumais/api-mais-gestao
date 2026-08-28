import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import * as schema from "../../drizzle/schema.js";
import { db } from "./connection.js";

export type IbptAliquota = typeof schema.ibptAliquota.$inferSelect;
export type NovaIbptAliquota = typeof schema.ibptAliquota.$inferInsert;
export type IbptImportacao = typeof schema.ibptImportacao.$inferSelect;

export async function buscarIbptAliquotaPorNcm(
	uf: string,
	ncm: string,
	ex = "0",
): Promise<IbptAliquota | undefined> {
	const ncmNormalizado = ncm.replace(/\D/g, "").padStart(8, "0").slice(0, 8);
	const exNormalizado = ex.trim() || "0";
	const ufNormalizada = uf.trim().toUpperCase();

	const [registro] = await db
		.select()
		.from(schema.ibptAliquota)
		.where(
			and(
				eq(schema.ibptAliquota.uf, ufNormalizada),
				eq(schema.ibptAliquota.ncm, ncmNormalizado),
				eq(schema.ibptAliquota.ex, exNormalizado),
			),
		)
		.limit(1);

	return registro;
}

export async function buscarIbptAliquotasPorNcms(
	uf: string,
	ncms: string[],
): Promise<Map<string, IbptAliquota>> {
	const ufNormalizada = uf.trim().toUpperCase();
	const ncmsNormalizados = [
		...new Set(
			ncms
				.map((ncm) => ncm.replace(/\D/g, "").padStart(8, "0").slice(0, 8))
				.filter(Boolean),
		),
	];

	if (ncmsNormalizados.length === 0) {
		return new Map();
	}

	const registros = await db
		.select()
		.from(schema.ibptAliquota)
		.where(
			and(
				eq(schema.ibptAliquota.uf, ufNormalizada),
				inArray(schema.ibptAliquota.ncm, ncmsNormalizados),
				eq(schema.ibptAliquota.ex, "0"),
			),
		);

	const mapa = new Map<string, IbptAliquota>();
	for (const registro of registros) {
		mapa.set(registro.ncm, registro);
	}
	return mapa;
}

export async function buscarUltimaImportacaoIbptPorUf(uf: string) {
	const ufNormalizada = uf.trim().toUpperCase();
	const [registro] = await db
		.select()
		.from(schema.ibptImportacao)
		.where(eq(schema.ibptImportacao.uf, ufNormalizada))
		.orderBy(desc(schema.ibptImportacao.importadoEm))
		.limit(1);

	return registro;
}

export async function registrarImportacaoIbpt(dados: {
	uf: string;
	chave: string;
	versao?: string | null;
	fonte?: string | null;
	quantidadeRegistros: number;
	idusuario?: string | null;
}) {
	const agora = new Date().toISOString();
	const [registro] = await db
		.insert(schema.ibptImportacao)
		.values({
			id: uuidv4(),
			uf: dados.uf.trim().toUpperCase(),
			chave: dados.chave,
			versao: dados.versao ?? null,
			fonte: dados.fonte ?? "IBPT/empresometro.com.br",
			quantidadeRegistros: String(dados.quantidadeRegistros),
			idusuario: dados.idusuario ?? null,
			importadoEm: agora,
		})
		.returning();

	return registro;
}

export async function substituirAliquotasIbptPorUf(
	uf: string,
	registros: Omit<NovaIbptAliquota, "id" | "importadoEm">[],
) {
	const ufNormalizada = uf.trim().toUpperCase();
	const agora = new Date().toISOString();

	await db.transaction(async (tx) => {
		await tx
			.delete(schema.ibptAliquota)
			.where(eq(schema.ibptAliquota.uf, ufNormalizada));

		const lote = 500;
		for (let i = 0; i < registros.length; i += lote) {
			const fatia = registros.slice(i, i + lote).map((registro) => ({
				...registro,
				id: uuidv4(),
				uf: ufNormalizada,
				importadoEm: agora,
			}));
			await tx.insert(schema.ibptAliquota).values(fatia);
		}
	});
}

export async function contarAliquotasIbptPorUf(uf: string): Promise<number> {
	const ufNormalizada = uf.trim().toUpperCase();
	const [resultado] = await db
		.select({ total: sql<number>`count(*)::int` })
		.from(schema.ibptAliquota)
		.where(eq(schema.ibptAliquota.uf, ufNormalizada));

	return resultado?.total ?? 0;
}

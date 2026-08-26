import { and, desc, eq } from "drizzle-orm";
import { apuracaoefdajuste } from "@/repositories/schema.js";
import type { AjusteApuracaoEfd } from "@/service/efd-icms/tipos-efd-icms.js";
import { db } from "./connection.js";

export type ApuracaoEfdAjuste = typeof apuracaoefdajuste.$inferSelect;
export type NovaApuracaoEfdAjuste = typeof apuracaoefdajuste.$inferInsert;

export async function listarAjustesApuracaoEfd(
	idempresa: string,
	competencia: string,
	tipo?: "icms" | "pis" | "cofins",
): Promise<AjusteApuracaoEfd[]> {
	const where = [
		eq(apuracaoefdajuste.idempresa, idempresa),
		eq(apuracaoefdajuste.competencia, competencia),
	];
	if (tipo) {
		where.push(eq(apuracaoefdajuste.tipo, tipo));
	}

	const registros = await db
		.select()
		.from(apuracaoefdajuste)
		.where(and(...where))
		.orderBy(desc(apuracaoefdajuste.criadoem));

	return registros.map((registro) => ({
		codigoajuste: registro.codigoajuste,
		descricao: registro.descricao,
		valor: registro.valor,
		natureza: registro.natureza === "credito" ? "credito" : "debito",
		tipo:
			registro.tipo === "pis" || registro.tipo === "cofins"
				? registro.tipo
				: "icms",
	}));
}

export async function listarAjustesApuracaoEfdCompleto(
	idempresa: string,
	competencia?: string,
): Promise<ApuracaoEfdAjuste[]> {
	const where = [eq(apuracaoefdajuste.idempresa, idempresa)];
	if (competencia) {
		where.push(eq(apuracaoefdajuste.competencia, competencia));
	}

	return db
		.select()
		.from(apuracaoefdajuste)
		.where(and(...where))
		.orderBy(
			desc(apuracaoefdajuste.competencia),
			desc(apuracaoefdajuste.criadoem),
		);
}

export async function criarAjusteApuracaoEfd(dados: NovaApuracaoEfdAjuste) {
	const [registro] = await db
		.insert(apuracaoefdajuste)
		.values(dados)
		.returning();
	return registro;
}

export async function excluirAjusteApuracaoEfd(id: string, idempresa: string) {
	const [registro] = await db
		.delete(apuracaoefdajuste)
		.where(
			and(
				eq(apuracaoefdajuste.id, id),
				eq(apuracaoefdajuste.idempresa, idempresa),
			),
		)
		.returning();
	return registro;
}

import { and, asc, eq } from "drizzle-orm";
import type { NovoTipoOrdemServicoEvento } from "@/model/tipo-ordem-servico-evento-model";
import { tipoordemservicoevento } from "@/repositories/schema.js";
import { db } from "./connection";

export async function buscarTipoOrdemServicoEventoPorId(
	id: string,
	idempresa: string,
) {
	const [registro] = await db
		.select()
		.from(tipoordemservicoevento)
		.where(
			and(
				eq(tipoordemservicoevento.id, id),
				eq(tipoordemservicoevento.idempresa, idempresa),
			),
		);

	return registro;
}

export async function buscarTipoOrdemServicoEventoPorCodigo(
	idempresa: string,
	codigo: string,
) {
	const [registro] = await db
		.select()
		.from(tipoordemservicoevento)
		.where(
			and(
				eq(tipoordemservicoevento.idempresa, idempresa),
				eq(tipoordemservicoevento.codigo, codigo),
			),
		);

	return registro;
}

export async function listarTiposOrdemServicoEvento(
	idempresa: string,
	somenteAtivos = false,
) {
	const where = [eq(tipoordemservicoevento.idempresa, idempresa)];
	if (somenteAtivos) {
		where.push(eq(tipoordemservicoevento.ativo, 1));
	}

	return db
		.select()
		.from(tipoordemservicoevento)
		.where(and(...where))
		.orderBy(
			asc(tipoordemservicoevento.ordem),
			asc(tipoordemservicoevento.descricao),
		);
}

export async function criarTipoOrdemServicoEvento(
	dados: NovoTipoOrdemServicoEvento,
) {
	const [registro] = await db
		.insert(tipoordemservicoevento)
		.values(dados)
		.returning();

	return registro;
}

export async function criarTiposOrdemServicoEventoEmLote(
	dados: NovoTipoOrdemServicoEvento[],
) {
	if (dados.length === 0) return [];
	return db.insert(tipoordemservicoevento).values(dados).returning();
}

export async function atualizarTipoOrdemServicoEvento(
	id: string,
	idempresa: string,
	dados: Partial<
		Pick<
			NovoTipoOrdemServicoEvento,
			"descricao" | "cor" | "ordem" | "ativo" | "dataalteracao"
		>
	>,
) {
	const [registro] = await db
		.update(tipoordemservicoevento)
		.set({
			...dados,
			dataalteracao: new Date().toISOString(),
		})
		.where(
			and(
				eq(tipoordemservicoevento.id, id),
				eq(tipoordemservicoevento.idempresa, idempresa),
			),
		)
		.returning();

	return registro;
}

export async function inativarTipoOrdemServicoEvento(
	id: string,
	idempresa: string,
) {
	return atualizarTipoOrdemServicoEvento(id, idempresa, { ativo: 0 });
}

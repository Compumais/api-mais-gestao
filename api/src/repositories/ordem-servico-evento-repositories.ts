import { and, count, desc, eq } from "drizzle-orm";
import type { NovoOrdemServicoEvento } from "@/model/ordem-servico-evento-model";
import { ordemservicoevento } from "@/repositories/schema.js";
import { db } from "./connection";

export async function criarOrdemServicoEvento(dados: NovoOrdemServicoEvento) {
	const [registro] = await db
		.insert(ordemservicoevento)
		.values(dados)
		.returning();

	return registro;
}

export async function listarEventosPorOrdemServico(
	idordemservico: string,
	idempresa: string,
) {
	return db
		.select()
		.from(ordemservicoevento)
		.where(
			and(
				eq(ordemservicoevento.idordemservico, idordemservico),
				eq(ordemservicoevento.idempresa, idempresa),
			),
		)
		.orderBy(
			desc(ordemservicoevento.data),
			desc(ordemservicoevento.datacriacao),
		);
}

export async function contarEventosPorTipo(
	idtipoevento: string,
	idempresa: string,
) {
	const [resultado] = await db
		.select({ value: count() })
		.from(ordemservicoevento)
		.where(
			and(
				eq(ordemservicoevento.idtipoevento, idtipoevento),
				eq(ordemservicoevento.idempresa, idempresa),
			),
		);

	return resultado?.value ?? 0;
}

import type { ContaCorrente } from "@/model/conta-corrente-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { buscarContaCorrentePorId } from "@/repositories/conta-corrente-repositories.js";
import { httpNaoEncontrado, httpOk } from "@/util/http-util.js";

export async function buscarContaCorrentePorIdService({
	id,
}: {
	id: string;
}): Promise<HttpResponse<ContaCorrente>> {
	const contaCorrente = await buscarContaCorrentePorId({ id });

	if (!contaCorrente) {
		return httpNaoEncontrado();
	}

	return httpOk<ContaCorrente>(contaCorrente);
}

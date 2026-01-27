import type { ContaCorrente } from "@/model/conta-corrente-model";
import type { HttpResponse } from "@/model/http-model";
import { buscarContaCorrentePorId } from "@/repositories/conta-corrente-repositories";
import { httpNaoEncontrado, httpOk } from "@/util/http-util";

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

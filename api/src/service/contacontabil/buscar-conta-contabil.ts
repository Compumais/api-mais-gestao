import type { ContaContabil } from "@/model/conta-contabil-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { buscarContaContabilPorId } from "@/repositories/conta-contabil-repositories.js";
import { httpNaoEncontrado, httpOk } from "@/util/http-util.js";

type BuscarContaContabilParametros = {
	id: string;
};

export async function buscarContaContabilService({
	id,
}: BuscarContaContabilParametros): Promise<HttpResponse<ContaContabil>> {
	const contaContabil = await buscarContaContabilPorId(id);

	if (!contaContabil) {
		return httpNaoEncontrado();
	}

	return httpOk<ContaContabil>(contaContabil);
}

import type { Financeiro } from "@/model/financeiro-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { buscarFinanceiroPorId } from "@/repositories/financeiro-repositories.js";
import { httpNaoEncontrado, httpOk } from "@/util/http-util.js";

export async function buscarFinanceiroService(
	id: string,
): Promise<HttpResponse<Financeiro | null>> {
	const financeiro = await buscarFinanceiroPorId(id);

	if (!financeiro) {
		return httpNaoEncontrado();
	}

	return httpOk<Financeiro>(financeiro);
}

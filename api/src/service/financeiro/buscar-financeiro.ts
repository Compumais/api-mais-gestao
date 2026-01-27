import type { Financeiro } from "@/model/financeiro-model";
import type { HttpResponse } from "@/model/http-model";
import { buscarFinanceiroPorId } from "@/repositories/financeiro-repositories";
import { httpNaoEncontrado, httpOk } from "@/util/http-util";

export async function buscarFinanceiroService(
	id: string,
): Promise<HttpResponse<Financeiro | null>> {
	const financeiro = await buscarFinanceiroPorId(id);

	if (!financeiro) {
		return httpNaoEncontrado();
	}

	return httpOk<Financeiro>(financeiro);
}

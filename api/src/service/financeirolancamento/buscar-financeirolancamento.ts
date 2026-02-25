import type { FinanceiroLancamento } from "@/model/financeiro-lancamentos-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { buscarFinanceiroLancamentoPorId } from "@/repositories/financeiro-lancamento-repositories.js";

import { httpNaoEncontrado, httpOk } from "@/util/http-util.js";

export async function buscarFinanceiroLancamentoPorIdService(
	id: string,
): Promise<HttpResponse<FinanceiroLancamento | null>> {
	const financeiroLancamento = await buscarFinanceiroLancamentoPorId(id);

	if (!financeiroLancamento) {
		return httpNaoEncontrado();
	}

	return httpOk<FinanceiroLancamento>(financeiroLancamento);
}

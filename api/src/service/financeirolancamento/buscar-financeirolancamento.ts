import type { FinanceiroLancamento } from "@/model/financeiro-lancamentos-model";
import type { HttpResponse } from "@/model/http-model";
import { buscarFinanceiroLancamentoPorId } from "@/repositories/financeiro-lancamento-repositories";

import { httpNaoEncontrado, httpOk } from "@/util/http-util";

export async function buscarFinanceiroLancamentoPorIdService(
	id: string,
): Promise<HttpResponse<FinanceiroLancamento | null>> {
	const financeiroLancamento = await buscarFinanceiroLancamentoPorId(id);

	if (!financeiroLancamento) {
		return httpNaoEncontrado();
	}

	return httpOk<FinanceiroLancamento>(financeiroLancamento);
}

import type { HttpResponse } from "@/model/http-model.js";
import {
	buscarFinanceiroLancamentoPorId,
	excluirFinanceiroLancamento,
} from "@/repositories/financeiro-lancamento-repositories.js";
import { httpNaoEncontrado, httpSemConteudo } from "@/util/http-util.js";

export async function excluirFinanceiroLancamentoService(
	id: string,
): Promise<HttpResponse<void>> {
	const financeiroLancamento = await buscarFinanceiroLancamentoPorId(id);

	if (!financeiroLancamento) {
		return httpNaoEncontrado();
	}

	await excluirFinanceiroLancamento(id);

	return httpSemConteudo();
}

import type { HttpResponse } from "@/model/http-model";
import {
	buscarFinanceiroLancamentoPorId,
	excluirFinanceiroLancamento,
} from "@/repositories/financeiro-lancamento-repositories";
import { httpNaoEncontrado, httpSemConteudo } from "@/util/http-util";

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

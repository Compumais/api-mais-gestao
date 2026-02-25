import type {
	FinanceiroLancamento,
	NovoFinanceiroLancamento,
} from "@/model/financeiro-lancamentos-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { criarFinanceiroLancamento } from "@/repositories/financeiro-lancamento-repositories.js";
import { httpCriacao, httpErro } from "@/util/http-util.js";

interface CriarFinanceiroLancamentoParametros {
	dadosFinanceiroLancamento: NovoFinanceiroLancamento;
}

export async function criarFinanceiroLancamentoService({
	dadosFinanceiroLancamento,
}: CriarFinanceiroLancamentoParametros): Promise<
	HttpResponse<FinanceiroLancamento>
> {
	const financeiroLancamento = await criarFinanceiroLancamento(
		dadosFinanceiroLancamento,
	);

	if (!financeiroLancamento) {
		return httpErro();
	}

	return httpCriacao<FinanceiroLancamento>(financeiroLancamento);
}

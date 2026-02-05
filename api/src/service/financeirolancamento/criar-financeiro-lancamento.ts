import type {
	FinanceiroLancamento,
	NovoFinanceiroLancamento,
} from "@/model/financeiro-lancamentos-model";
import type { HttpResponse } from "@/model/http-model";
import { criarFinanceiroLancamento } from "@/repositories/financeiro-lancamento-repositories";
import { httpCriacao, httpErro } from "@/util/http-util";

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

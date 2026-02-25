import type { FinanceiroLancamento } from "@/model/financeiro-lancamentos-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { listarFinanceiroLancamento } from "@/repositories/financeiro-lancamento-repositories.js";
import { httpOk } from "@/util/http-util.js";

type ListarFinanceiroLancamentoParametros = {
	idfinanceiro: string;
	page?: number;
	limit?: number;
};

type ListarFinanceiroLancamentoResposta = {
	data: FinanceiroLancamento[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarFinanceiroLancamentoService({
	idfinanceiro,
	page = 1,
	limit = 10,
}: ListarFinanceiroLancamentoParametros): Promise<
	HttpResponse<ListarFinanceiroLancamentoResposta>
> {
	const { total, financeiroLancamentos } = await listarFinanceiroLancamento({
		idfinanceiro,
		limit,
		page,
	});

	const totalPages = Math.ceil(total / limit);

	return httpOk<ListarFinanceiroLancamentoResposta>({
		data: financeiroLancamentos,
		paginacao: {
			page,
			limit,
			total,
			totalPages,
		},
	});
}

import type { ContaCorrenteLancamento } from "@/model/conta-corrente-lancamento-model";
import type { HttpResponse } from "@/model/http-model";
import { listarLancamentoContaCorrentePorEmpresa } from "@/repositories/conta-corrente-lancamento-repositories";
import { httpOk } from "@/util/http-util";

interface ListarContaCorrenteLancamentosParametros {
	idcontacorrente: string;
	page?: number;
	limit?: number;
}

interface ListarContaCorrenteLancamentosResposta {
	data: ContaCorrenteLancamento[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export async function listarContaCorrenteLancamentosService({
	idcontacorrente,
	page = 1,
	limit = 10,
}: ListarContaCorrenteLancamentosParametros): Promise<
	HttpResponse<ListarContaCorrenteLancamentosResposta>
> {
	const lancamentos = await listarLancamentoContaCorrentePorEmpresa({
		idcontacorrente,
		page,
		limit,
	});

	const total = lancamentos.length;
	const totalPages = Math.ceil(total / limit);

	return httpOk<ListarContaCorrenteLancamentosResposta>({
		data: lancamentos,
		paginacao: {
			page,
			limit,
			total,
			totalPages,
		},
	});
}

import type { HttpResponse } from "@/model/http-model";
import type { LancamentoComRelacionamentos } from "@/repositories/conta-corrente-lancamento-repositories";
import {
	listarLancamentoContaCorrentePorEmpresa,
} from "@/repositories/conta-corrente-lancamento-repositories";
import { httpOk } from "@/util/http-util";

interface ListarContaCorrenteLancamentosParametros {
	idcontacorrente: string;
	page?: number;
	limit?: number;
}

interface ListarContaCorrenteLancamentosResposta {
	data: LancamentoComRelacionamentos[];
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
	const { lancamentos, total } = await listarLancamentoContaCorrentePorEmpresa({
		idcontacorrente,
		page,
		limit,
	});

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

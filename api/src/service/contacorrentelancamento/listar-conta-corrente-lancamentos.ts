import type { HttpResponse } from "@/model/http-model.js";
import type { LancamentoComRelacionamentos } from "@/repositories/conta-corrente-lancamento-repositories.js";
import {
	listarLancamentoContaCorrentePorEmpresa,
	type OrdenarContaCorrenteLancamentosCampo,
} from "@/repositories/conta-corrente-lancamento-repositories.js";
import { httpOk } from "@/util/http-util.js";

interface ListarContaCorrenteLancamentosParametros {
	idcontacorrente: string;
	historico?: string | undefined;
	documento?: string | undefined;
	planocontasnome?: string | undefined;
	datahora?: string | undefined;
	sentido?: "entrada" | "saida" | undefined;
	ordenarPor?: OrdenarContaCorrenteLancamentosCampo | undefined;
	ordem?: "asc" | "desc" | undefined;
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
	historico,
	documento,
	planocontasnome,
	datahora,
	sentido,
	ordenarPor,
	ordem,
	page = 1,
	limit = 10,
}: ListarContaCorrenteLancamentosParametros): Promise<
	HttpResponse<ListarContaCorrenteLancamentosResposta>
> {
	const { lancamentos, total } = await listarLancamentoContaCorrentePorEmpresa({
		idcontacorrente,
		historico,
		documento,
		planocontasnome,
		datahora,
		sentido,
		ordenarPor,
		ordem,
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

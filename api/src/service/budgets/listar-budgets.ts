import type { BudgetComPlanoContas } from "@/model/budget-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { listarBudgets } from "@/repositories/budget-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpOk } from "@/util/http-util.js";

type ListarBudgetsParametros = {
	idusuario: string;
	idempresa: string;
	ano?: number | undefined;
	mes?: number | undefined;
	periodicidade?: string | undefined;
	idplanocontas?: string | undefined;
	page?: number;
	limit?: number;
};

type ListarBudgetsResposta = {
	data: BudgetComPlanoContas[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarBudgetsService({
	idusuario,
	idempresa,
	ano,
	mes,
	periodicidade,
	idplanocontas,
	page = 1,
	limit = 10,
}: ListarBudgetsParametros): Promise<HttpResponse<ListarBudgetsResposta>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpOk<ListarBudgetsResposta>({
			data: [],
			paginacao: {
				page,
				limit,
				total: 0,
				totalPages: 0,
			},
		});
	}

	const { budgets, total } = await listarBudgets({
		idempresa,
		ano,
		mes,
		periodicidade,
		idplanocontas,
		page,
		limit,
	});

	const totalPages = Math.ceil(total / limit);

	return httpOk<ListarBudgetsResposta>({
		data: budgets,
		paginacao: {
			page,
			limit,
			total,
			totalPages,
		},
	});
}

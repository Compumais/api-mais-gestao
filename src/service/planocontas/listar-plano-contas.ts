import type { HttpResponse } from "@/model/http-model";
import type { PlanoContas } from "@/model/plano-contas-model";
import {
	buscarEmpresasDoUsuario,
} from "@/repositories/clientes-repositories";
import {
	listarPlanoContasPorEmpresas,
} from "@/repositories/plano-contas-repositories";
import { httpOk } from "@/util/http-util";

type ListarPlanoContasParametros = {
	userId: string;
	page?: number;
	limit?: number;
};

type ListarPlanoContasResposta = {
	data: PlanoContas[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarPlanoContasService({
	userId,
	page = 1,
	limit = 10,
}: ListarPlanoContasParametros): Promise<HttpResponse<ListarPlanoContasResposta>> {
	const empresaIds = await buscarEmpresasDoUsuario(userId);

	if (empresaIds.length === 0) {
		return httpOk<ListarPlanoContasResposta>({
			data: [],
			paginacao: {
				page,
				limit,
				total: 0,
				totalPages: 0,
			},
		});
	}

	const { planosContas, total } = await listarPlanoContasPorEmpresas({
		empresaIds,
		page,
		limit,
	});

	const totalPages = Math.ceil(total / limit);

	return httpOk<ListarPlanoContasResposta>({
		data: planosContas,
		paginacao: {
			page,
			limit,
			total,
			totalPages,
		},
	});
}


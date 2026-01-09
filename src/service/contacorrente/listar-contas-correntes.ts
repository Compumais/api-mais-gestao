import type { HttpResponse } from "@/model/http-model";
import { listarContaCorrentePorEmpresa } from "@/repositories/conta-corrente-repositories";
import { httpOk } from "@/util/http-util";

interface ListarContasCorrentesParametros {
	empresaId: string;
	page?: number;
	limit?: number;
}

interface ListarContasCorrentesResposta {
	data: {
		id: string;
		agencia: string | null;
		descricao: string | null;
	}[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export async function listarContasCorrentesService({
	empresaId,
	page = 1,
	limit = 10,
}: ListarContasCorrentesParametros): Promise<
	HttpResponse<ListarContasCorrentesResposta>
> {
	const { contasCorrentes, total } = await listarContaCorrentePorEmpresa({
		empresaIds: [empresaId],
		limit,
		page,
	});

	if (!contasCorrentes) {
		return {
			success: true,
			body: {
				data: [],
				paginacao: {
					page,
					limit,
					total: 0,
					totalPages: 0,
				},
			},
			status: 204,
		};
	}

	const totalPages = Math.ceil(total / limit);

	return httpOk<ListarContasCorrentesResposta>({
		data: contasCorrentes,
		paginacao: {
			page,
			limit,
			total,
			totalPages,
		},
	});
}

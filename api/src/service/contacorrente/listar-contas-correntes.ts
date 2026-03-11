import type { HttpResponse } from "@/model/http-model.js";
import { listarContaCorrentePorEmpresa } from "@/repositories/conta-corrente-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpNaoEncontrado, httpOk } from "@/util/http-util.js";

interface ListarContasCorrentesParametros {
	idusuario: string;
	idempresa: string;
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
	idusuario,
	idempresa,
	page = 1,
	limit = 10,
}: ListarContasCorrentesParametros): Promise<
	HttpResponse<ListarContasCorrentesResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpNaoEncontrado();
	}

	const { contasCorrentes, total } = await listarContaCorrentePorEmpresa({
		idempresas: [idempresa],
		limit,
		page,
	});

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

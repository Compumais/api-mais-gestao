import type { HttpResponse } from "@/model/http-model.js";
import type { UnidadeMedida } from "@/model/unidade-medida-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { listarUnidadesMedida } from "@/repositories/unidade-medida-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

type ListarUnidadeMedidasParametros = {
	idusuario: string;
	idempresa: string;
	nome?: string | undefined;
	q?: string | undefined;
	page?: number;
	limit?: number;
};

type ListarUnidadeMedidasResposta = {
	data: UnidadeMedida[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarUnidadeMedidasService({
	idusuario,
	idempresa,
	nome,
	q,
	page = 1,
	limit = 10,
}: ListarUnidadeMedidasParametros): Promise<
	HttpResponse<ListarUnidadeMedidasResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const resultado = await listarUnidadesMedida({
		idempresa,
		nome,
		q,
		page,
		limit,
	});

	const total = resultado.total ?? 0;
	const totalPages = Math.ceil(total / limit);

	return httpOk<ListarUnidadeMedidasResposta>({
		data: resultado.unidadesmedida,
		paginacao: {
			page,
			limit,
			total,
			totalPages,
		},
	});
}

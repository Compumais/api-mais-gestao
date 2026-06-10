import type { CentroCusto } from "@/model/centro-custo-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { listarCentrosCusto } from "@/repositories/centro-custo-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

type ListarCentrosCustoParametros = {
	idusuario: string;
	idempresa: string;
	nome?: string | undefined;
	inativo?: number | undefined;
	page?: number;
	limit?: number;
};

type ListarCentroCustosResposta = {
	data: CentroCusto[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarCentroCustosService({
	idusuario,
	idempresa,
	nome,
	inativo,
	page = 1,
	limit = 10,
}: ListarCentrosCustoParametros): Promise<
	HttpResponse<ListarCentroCustosResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const resultado = await listarCentrosCusto({
		idempresa,
		nome,
		inativo,
		page,
		limit,
	});

	const total = resultado.total ?? 0;
	const totalPages = Math.ceil(total / limit);

	return httpOk<ListarCentroCustosResposta>({
		data: resultado.centrocustos,
		paginacao: {
			page,
			limit,
			total,
			totalPages,
		},
	});
}

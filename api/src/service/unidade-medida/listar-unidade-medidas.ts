import type { HttpResponse } from "@/model/http-model.js";
import type { UnidadeMedida } from "@/model/unidade-medida-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	type ListarUnidadesMedidaParametros,
	listarUnidadesMedida,
} from "@/repositories/unidade-medida-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

type ListarUnidadeMedidasServiceParametros = Omit<
	ListarUnidadesMedidaParametros,
	never
> & {
	idusuario: string;
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
	page = 1,
	limit = 10,
	...filtros
}: ListarUnidadeMedidasServiceParametros): Promise<
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
		page,
		limit,
		...filtros,
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

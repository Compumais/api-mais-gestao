import type { Departamento } from "@/model/departamento-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { listarDepartamentos } from "@/repositories/departamento-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

type ListarDepartamentosParametros = {
	idusuario: string;
	idempresa: string;
	descricao?: string | undefined;
	inativo?: number | undefined;
	page?: number;
	limit?: number;
};

type ListarDepartamentosResposta = {
	data: Departamento[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarDepartamentosService({
	idusuario,
	idempresa,
	descricao,
	inativo,
	page = 1,
	limit = 10,
}: ListarDepartamentosParametros): Promise<
	HttpResponse<ListarDepartamentosResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const resultado = await listarDepartamentos({
		idempresa,
		descricao,
		inativo,
		page,
		limit,
	});

	const total = resultado.total ?? 0;
	const totalPages = Math.ceil(total / limit);

	return httpOk<ListarDepartamentosResposta>({
		data: resultado.departamentos,
		paginacao: {
			page,
			limit,
			total,
			totalPages,
		},
	});
}

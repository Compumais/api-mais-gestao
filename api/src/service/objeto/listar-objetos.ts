import type { HttpResponse } from "@/model/http-model.js";
import type { Objeto } from "@/model/objeto-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { listarObjetos } from "@/repositories/objeto-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

type ListarObjetosParametros = {
	idusuario: string;
	idempresa: string;
	descricao?: string | undefined;
	inativo?: number | undefined;
	page?: number;
	limit?: number;
};

type ListarObjetosResposta = {
	data: Objeto[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarObjetosService({
	idusuario,
	idempresa,
	descricao,
	inativo,
	page = 1,
	limit = 10,
}: ListarObjetosParametros): Promise<HttpResponse<ListarObjetosResposta>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const resultado = await listarObjetos({
		idempresa,
		descricao,
		inativo,
		page,
		limit,
	});

	const total = resultado.total ?? 0;
	const totalPages = Math.ceil(total / limit);

	return httpOk<ListarObjetosResposta>({
		data: resultado.objetos,
		paginacao: {
			page,
			limit,
			total,
			totalPages,
		},
	});
}

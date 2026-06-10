import type { Area } from "@/model/area-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { listarAreas } from "@/repositories/area-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

type ListarAreasParametros = {
	idusuario: string;
	idempresa: string;
	descricao?: string | undefined;
	inativo?: number | undefined;
	page?: number;
	limit?: number;
};

type ListarAreasResposta = {
	data: Area[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarAreasService({
	idusuario,
	idempresa,
	descricao,
	inativo,
	page = 1,
	limit = 10,
}: ListarAreasParametros): Promise<HttpResponse<ListarAreasResposta>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const resultado = await listarAreas({
		idempresa,
		descricao,
		inativo,
		page,
		limit,
	});

	const total = resultado.total ?? 0;
	const totalPages = Math.ceil(total / limit);

	return httpOk<ListarAreasResposta>({
		data: resultado.areas,
		paginacao: {
			page,
			limit,
			total,
			totalPages,
		},
	});
}

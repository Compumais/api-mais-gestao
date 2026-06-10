import type { DAV } from "@/model/dav-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { listarDavs } from "@/repositories/dav-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

type ListarDavsParametros = {
	idusuario: string;
	idempresa: string;
	page?: number;
	limit?: number;
};

type ListarDavsResposta = {
	data: DAV[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarDavsService({
	idusuario,
	idempresa,
	page = 1,
	limit = 10,
}: ListarDavsParametros): Promise<HttpResponse<ListarDavsResposta>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const resultado = await listarDavs({
		idempresa,
		page,
		limit,
	});

	const total = resultado.total ?? 0;
	const totalPages = Math.ceil(total / limit);

	return httpOk<ListarDavsResposta>({
		data: resultado.davs,
		paginacao: {
			page,
			limit,
			total,
			totalPages,
		},
	});
}

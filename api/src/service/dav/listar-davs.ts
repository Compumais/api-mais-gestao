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
	dataInicio?: string | undefined;
	dataFim?: string | undefined;
	idcliente?: string | undefined;
	status?: number | undefined;
	faturado?: boolean | undefined;
	codigo?: number | undefined;
	busca?: string | undefined;
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
	dataInicio,
	dataFim,
	idcliente,
	status,
	faturado,
	codigo,
	busca,
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
		dataInicio,
		dataFim,
		idcliente,
		status,
		faturado,
		codigo,
		busca,
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

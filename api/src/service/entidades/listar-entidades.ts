import type { Entidade } from "@/model/entidade-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	buscarEmpresasDoUsuario,
	listarEntidades,
	verificarUsuarioPertenceEmpresa,
} from "@/repositories/entidade-repositories.js";
import { httpOk } from "@/util/http-util.js";

type ListarEntidadesParametros = {
	idusuario: string;
	nome?: string | undefined;
	email?: string | undefined;
	telefone?: string | undefined;
	page?: number;
	limit?: number;
	idempresa: string;
};

type ListarEntidadesResposta = {
	data: Entidade[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarEntidadesService({
	idusuario,
	idempresa,
	nome,
	email,
	telefone,
	page = 1,
	limit = 10,
}: ListarEntidadesParametros): Promise<HttpResponse<ListarEntidadesResposta>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpOk<ListarEntidadesResposta>({
			data: [],
			paginacao: {
				page,
				limit,
				total: 0,
				totalPages: 0,
			},
		});
	}

	const { entidades, total } = await listarEntidades({
		idempresa,
		nome,
		email,
		telefone,
		page,
		limit,
	});

	const totalPages = Math.ceil(total / limit);

	return httpOk<ListarEntidadesResposta>({
		data: entidades,
		paginacao: {
			page,
			limit,
			total,
			totalPages,
		},
	});
}

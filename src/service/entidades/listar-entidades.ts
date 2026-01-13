import type { Entidade } from "@/model/entidade-model";
import type { HttpResponse } from "@/model/http-model";
import {
	buscarEmpresasDoUsuario,
	listarEntidades,
} from "@/repositories/entidade-repositories";
import { httpOk } from "@/util/http-util";

type ListarEntidadesParametros = {
	idusuario: string;
	nome?: string | undefined;
	email?: string | undefined;
	telefone?: string | undefined;
	page?: number;
	limit?: number;
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
	nome,
	email,
	telefone,
	page = 1,
	limit = 10,
}: ListarEntidadesParametros): Promise<HttpResponse<ListarEntidadesResposta>> {
	const idempresas = await buscarEmpresasDoUsuario(idusuario);

	if (idempresas.length === 0) {
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
		idempresas,
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

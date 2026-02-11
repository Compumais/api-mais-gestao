import type { Usuario } from "@/model/usuario-model";
import type { HttpResponse } from "@/model/http-model";
import { listarUsuariosPorEmpresa } from "@/repositories/usuarios-repositories";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories";
import { httpOk } from "@/util/http-util";

type ListarUsuariosParametros = {
	idusuario: string;
	idempresa: string;
	nome?: string;
	email?: string;
	page?: number;
	limit?: number;
};

type ListarUsuariosResposta = {
	data: Usuario[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarUsuariosService({
	idusuario,
	idempresa,
	nome,
	email,
	page = 1,
	limit = 10,
}: ListarUsuariosParametros): Promise<HttpResponse<ListarUsuariosResposta>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpOk<ListarUsuariosResposta>({
			data: [],
			paginacao: {
				page,
				limit,
				total: 0,
				totalPages: 0,
			},
		});
	}

	const { usuarios, total } = await listarUsuariosPorEmpresa({
		idempresa,
		nome,
		email,
		page,
		limit,
	});

	const totalPages = Math.ceil(total / limit);

	return httpOk<ListarUsuariosResposta>({
		data: usuarios,
		paginacao: {
			page,
			limit,
			total,
			totalPages,
		},
	});
}


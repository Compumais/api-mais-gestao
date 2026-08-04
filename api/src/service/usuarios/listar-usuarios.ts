import type { HttpResponse } from "@/model/http-model.js";
import type { Usuario } from "@/model/usuario-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { listarUsuariosPorEmpresa } from "@/repositories/usuarios-repositories.js";
import { httpOk } from "@/util/http-util.js";
import { verificarPodeGerenciarUsuarios } from "@/util/verificar-gestao-usuarios.js";

export type UsuarioSelecao = {
	id: string;
	nome: string;
};

type ListarUsuariosParametros = {
	idusuario: string;
	roles: string | string[];
	idempresa: string;
	nome?: string | null | undefined;
	email?: string | null | undefined;
	page?: number;
	limit?: number;
};

type ListarUsuariosResposta = {
	data: Array<Usuario | UsuarioSelecao>;
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

function sanitizarUsuarioOperacional(usuario: Usuario): UsuarioSelecao {
	return {
		id: usuario.id,
		nome: usuario.nome,
	};
}

export async function listarUsuariosService({
	idusuario,
	roles,
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

	const podeGerenciar = verificarPodeGerenciarUsuarios(roles);
	const { usuarios, total } = await listarUsuariosPorEmpresa({
		idempresa,
		nome,
		email: podeGerenciar ? email : undefined,
		page,
		limit,
	});

	const totalPages = Math.ceil(total / limit);
	const data = podeGerenciar
		? usuarios
		: usuarios.map(sanitizarUsuarioOperacional);

	return httpOk<ListarUsuariosResposta>({
		data,
		paginacao: {
			page,
			limit,
			total,
			totalPages,
		},
	});
}

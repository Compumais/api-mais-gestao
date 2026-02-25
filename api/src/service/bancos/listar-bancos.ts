import type { Banco } from "@/model/banco-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { listarBancos } from "@/repositories/banco-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpOk } from "@/util/http-util.js";

type ListarBancosParametros = {
	idusuario: string;
	idempresa: string;
	nome?: string | undefined;
	codigo?: string | undefined;
	page?: number;
	limit?: number;
};

type ListarBancosResposta = {
	data: Banco[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarBancosService({
	idusuario,
	idempresa,
	nome,
	codigo,
	page = 1,
	limit = 10,
}: ListarBancosParametros): Promise<HttpResponse<ListarBancosResposta>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpOk<ListarBancosResposta>({
			data: [],
			paginacao: {
				page,
				limit,
				total: 0,
				totalPages: 0,
			},
		});
	}

	const { bancos, total } = await listarBancos({
		idempresa,
		nome: nome,
		codigo: codigo,
		page,
		limit,
	});

	const totalPages = Math.ceil(total / limit);

	return httpOk<ListarBancosResposta>({
		data: bancos,
		paginacao: {
			page,
			limit,
			total,
			totalPages,
		},
	});
}

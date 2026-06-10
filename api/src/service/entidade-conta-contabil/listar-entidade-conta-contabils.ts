import type { EntidadeContaContabil } from "@/model/entidade-conta-contabil-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { listarEntidadesContaContabil } from "@/repositories/entidade-conta-contabil-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

type ListarEntidadeContaContabilsParametros = {
	idusuario: string;
	idempresa: string;
	page?: number;
	limit?: number;
};

type ListarEntidadeContaContabilsResposta = {
	data: EntidadeContaContabil[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarEntidadeContaContabilsService({
	idusuario,
	idempresa,
	page = 1,
	limit = 10,
}: ListarEntidadeContaContabilsParametros): Promise<
	HttpResponse<ListarEntidadeContaContabilsResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const resultado = await listarEntidadesContaContabil({
		idempresa,
		page,
		limit,
	});

	const total = resultado.total ?? 0;
	const totalPages = Math.ceil(total / limit);

	return httpOk<ListarEntidadeContaContabilsResposta>({
		data: resultado.entidadescontacontabil,
		paginacao: {
			page,
			limit,
			total,
			totalPages,
		},
	});
}

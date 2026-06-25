import type { CFOP } from "@/model/cfop-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { listarCfops } from "@/repositories/cfop-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

import type { TipoMovimentoCfop } from "@/util/cfop-padrao.js";

type ListarCfopsParametros = {
	idusuario: string;
	idempresa: string;
	descricao?: string | undefined;
	codigo?: string | undefined;
	tipomovimento?: TipoMovimentoCfop | undefined;
	page?: number;
	limit?: number;
};

type ListarCfopsResposta = {
	data: CFOP[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarCfopsService({
	idusuario,
	idempresa,
	descricao,
	codigo,
	tipomovimento,
	page = 1,
	limit = 10,
}: ListarCfopsParametros): Promise<HttpResponse<ListarCfopsResposta>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const resultado = await listarCfops({
		idempresa,
		descricao,
		codigo,
		tipomovimento,
		page,
		limit,
	});

	const total = resultado.total ?? 0;
	const totalPages = Math.ceil(total / limit);

	return httpOk<ListarCfopsResposta>({
		data: resultado.cfops,
		paginacao: {
			page,
			limit,
			total,
			totalPages,
		},
	});
}

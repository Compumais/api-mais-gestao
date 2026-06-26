import type { CEST } from "@/model/cest-mode.js";
import type { HttpResponse } from "@/model/http-model.js";
import { listarCests } from "@/repositories/cest-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { garantirCestsGlobais } from "@/util/cest-globais.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

type ListarCestsParametros = {
	idusuario: string;
	idempresa: string;
	descricao?: string | undefined;
	inativo?: number | undefined;
	page?: number;
	limit?: number;
};

type ListarCestsResposta = {
	data: CEST[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarCestsService({
	idusuario,
	idempresa,
	descricao,
	inativo,
	page = 1,
	limit = 10,
}: ListarCestsParametros): Promise<HttpResponse<ListarCestsResposta>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	await garantirCestsGlobais();

	const resultado = await listarCests({
		idempresa,
		descricao,
		inativo,
		page,
		limit,
	});

	const total = resultado.total ?? 0;
	const totalPages = Math.ceil(total / limit);

	return httpOk<ListarCestsResposta>({
		data: resultado.cests,
		paginacao: {
			page,
			limit,
			total,
			totalPages,
		},
	});
}

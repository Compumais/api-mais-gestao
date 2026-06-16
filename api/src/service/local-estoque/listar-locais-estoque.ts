import type { HttpResponse } from "@/model/http-model.js";
import type { LocalEstoque } from "@/model/local-estoque-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { listarLocaisEstoque } from "@/repositories/local-estoque-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

type ListarLocaisEstoqueParametros = {
	idusuario: string;
	idempresa: string;
	descricao?: string | undefined;
	codigo?: string | undefined;
	page?: number;
	limit?: number;
};

type ListarLocaisEstoqueResposta = {
	data: LocalEstoque[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarLocaisEstoqueService({
	idusuario,
	idempresa,
	descricao,
	codigo,
	page = 1,
	limit = 10,
}: ListarLocaisEstoqueParametros): Promise<
	HttpResponse<ListarLocaisEstoqueResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const { locaisEstoque, total } = await listarLocaisEstoque({
		idempresa,
		descricao,
		codigo,
		page,
		limit,
	});

	const totalPages = Math.ceil(total / limit);

	return httpOk<ListarLocaisEstoqueResposta>({
		data: locaisEstoque,
		paginacao: {
			page,
			limit,
			total,
			totalPages,
		},
	});
}

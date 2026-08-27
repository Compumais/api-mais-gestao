import type { HttpResponse } from "@/model/http-model.js";
import type { Produto } from "@/model/produto-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	type ListarProdutosPorEmpresaParametros,
	listarProdutosPorEmpresa,
} from "@/repositories/produtos-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

type ListarProdutosParametros = Omit<
	ListarProdutosPorEmpresaParametros,
	"idempresas"
> & {
	idusuario: string;
	idempresa: string;
};

type ListarProdutosResposta = {
	data: Produto[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarProdutosService({
	idusuario,
	idempresa,
	page = 1,
	limit = 10,
	...filtros
}: ListarProdutosParametros): Promise<HttpResponse<ListarProdutosResposta>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const resultado = await listarProdutosPorEmpresa({
		idempresas: [idempresa],
		page,
		limit,
		...filtros,
	});

	const total = resultado.total ?? 0;
	const totalPages = Math.ceil(total / limit);

	return httpOk<ListarProdutosResposta>({
		data: resultado.produtos,
		paginacao: {
			page,
			limit,
			total,
			totalPages,
		},
	});
}

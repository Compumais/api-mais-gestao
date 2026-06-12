import type { CustoProduto } from "@/model/custo-produto-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { listarCustosPorProduto } from "@/repositories/custo-produto-repositories.js";
import { httpOk } from "@/util/http-util.js";
import { validarAcessoProduto } from "./validar-acesso-produto.js";

type ListarCustosProdutoParametros = {
	idusuario: string;
	idproduto: string;
	page?: number;
	limit?: number;
};

type ListarCustosProdutoResposta = {
	data: CustoProduto[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarCustosProdutoService({
	idusuario,
	idproduto,
	page = 1,
	limit = 10,
}: ListarCustosProdutoParametros): Promise<
	HttpResponse<ListarCustosProdutoResposta>
> {
	const validacao = await validarAcessoProduto(idusuario, idproduto);

	if (!validacao.sucesso) {
		return validacao.resposta;
	}

	const resultado = await listarCustosPorProduto({
		idproduto,
		page,
		limit,
	});

	const total = resultado.total ?? 0;
	const totalPages = Math.ceil(total / limit);

	return httpOk<ListarCustosProdutoResposta>({
		data: resultado.custos,
		paginacao: {
			page,
			limit,
			total,
			totalPages,
		},
	});
}

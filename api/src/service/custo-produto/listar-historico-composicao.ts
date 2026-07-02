import type { HttpResponse } from "@/model/http-model.js";
import {
	type HistoricoComposicaoProduto,
	listarHistoricoComposicaoPorProduto,
} from "@/repositories/custo-produto-repositories.js";
import { httpOk } from "@/util/http-util.js";
import { validarAcessoProduto } from "./validar-acesso-produto.js";

type ListarHistoricoComposicaoParametros = {
	idusuario: string;
	idproduto: string;
	page?: number;
	limit?: number;
};

type ListarHistoricoComposicaoResposta = {
	data: HistoricoComposicaoProduto[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarHistoricoComposicaoService({
	idusuario,
	idproduto,
	page = 1,
	limit = 10,
}: ListarHistoricoComposicaoParametros): Promise<
	HttpResponse<ListarHistoricoComposicaoResposta>
> {
	const validacao = await validarAcessoProduto(idusuario, idproduto);

	if (!validacao.sucesso) {
		return validacao.resposta;
	}

	const resultado = await listarHistoricoComposicaoPorProduto({
		idproduto,
		page,
		limit,
	});

	const total = resultado.total ?? 0;
	const totalPages = Math.ceil(total / limit);

	return httpOk<ListarHistoricoComposicaoResposta>({
		data: resultado.historico,
		paginacao: {
			page,
			limit,
			total,
			totalPages,
		},
	});
}

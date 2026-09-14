import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	consultarRelatorioProdutosDados,
	type FiltrosRelatorioProdutos,
} from "@/repositories/relatorios-produtos-repositories.js";
import {
	CATALOGO_RELATORIO_PRODUTO,
	TIPOS_RELATORIO_PRODUTO,
	type TipoRelatorioProduto,
} from "@/service/relatorios/produtos-catalogo.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

export type ConsultarRelatorioProdutosParams = FiltrosRelatorioProdutos & {
	idusuario: string;
	tipo: TipoRelatorioProduto;
};

export type RelatorioProdutosResposta = {
	tipo: TipoRelatorioProduto;
	titulo: string;
	colunas: (typeof CATALOGO_RELATORIO_PRODUTO)[TipoRelatorioProduto]["colunas"];
	data: Record<string, string | number | null>[];
	resumo: Record<string, string | number>;
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
	avisos?: string[];
};

export function isTipoRelatorioProduto(
	valor: string,
): valor is TipoRelatorioProduto {
	return (TIPOS_RELATORIO_PRODUTO as readonly string[]).includes(valor);
}

export async function consultarRelatorioProdutosService(
	params: ConsultarRelatorioProdutosParams,
): Promise<HttpResponse<RelatorioProdutosResposta>> {
	const pertence = await verificarUsuarioPertenceEmpresa(
		params.idusuario,
		params.idempresa,
	);
	if (!pertence) {
		return httpProibido();
	}

	const page = params.page ?? 1;
	const limit = params.limit ?? 20;
	const catalogo = CATALOGO_RELATORIO_PRODUTO[params.tipo];
	const resultado = await consultarRelatorioProdutosDados(params.tipo, {
		...params,
		page,
		limit,
	});
	const totalPages = Math.max(1, Math.ceil(resultado.total / limit));

	return httpOk({
		tipo: params.tipo,
		titulo: catalogo.titulo,
		colunas: catalogo.colunas,
		data: resultado.data,
		resumo: resultado.resumo,
		paginacao: {
			page,
			limit,
			total: resultado.total,
			totalPages,
		},
		avisos: resultado.avisos,
	});
}

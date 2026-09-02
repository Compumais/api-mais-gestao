import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	type ProdutoCatalogoPdv,
	listarProdutosCatalogoPdv,
} from "@/repositories/produtos-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

type ListarProdutosCatalogoPdvParametros = {
	idusuario: string;
	idempresa: string;
	page?: number;
	limit?: number;
};

type ListarProdutosCatalogoPdvResposta = {
	data: ProdutoCatalogoPdv[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarProdutosCatalogoPdvService({
	idusuario,
	idempresa,
	page = 1,
	limit = 100,
}: ListarProdutosCatalogoPdvParametros): Promise<
	HttpResponse<ListarProdutosCatalogoPdvResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const resultado = await listarProdutosCatalogoPdv({
		idempresa,
		page,
		limit,
	});

	const total = resultado.total ?? 0;
	const totalPages = Math.max(1, Math.ceil(total / limit) || 1);

	return httpOk<ListarProdutosCatalogoPdvResposta>({
		data: resultado.produtos,
		paginacao: {
			page,
			limit,
			total,
			totalPages: total === 0 ? 0 : totalPages,
		},
	});
}

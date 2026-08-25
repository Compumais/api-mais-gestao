import type { CotacaoCompraListagem } from "@/model/cotacao-compra-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { listarCotacoesCompra } from "@/repositories/cotacao-compra-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpOk } from "@/util/http-util.js";

type ListarCotacoesCompraParametros = {
	idusuario: string;
	idempresa: string;
	status?: string | undefined;
	q?: string | undefined;
	page?: number;
	limit?: number;
};

type ListarCotacoesCompraResposta = {
	data: CotacaoCompraListagem[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarCotacoesCompraService({
	idusuario,
	idempresa,
	status,
	q,
	page = 1,
	limit = 10,
}: ListarCotacoesCompraParametros): Promise<
	HttpResponse<ListarCotacoesCompraResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpOk<ListarCotacoesCompraResposta>({
			data: [],
			paginacao: { page, limit, total: 0, totalPages: 0 },
		});
	}

	const { cotacoes, total } = await listarCotacoesCompra({
		idempresa,
		status,
		q,
		page,
		limit,
	});

	return httpOk<ListarCotacoesCompraResposta>({
		data: cotacoes,
		paginacao: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	});
}

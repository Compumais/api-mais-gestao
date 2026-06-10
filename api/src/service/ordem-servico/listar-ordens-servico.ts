import type { OrdemServico } from "@/model/ordem-servico-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { listarOrdensServico } from "@/repositories/ordem-servico-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

type ListarOrdensServicoParametros = {
	idusuario: string;
	idempresa: string;
	page?: number;
	limit?: number;
};

type ListarOrdensServicoResposta = {
	data: OrdemServico[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarOrdensServicoService({
	idusuario,
	idempresa,
	page = 1,
	limit = 10,
}: ListarOrdensServicoParametros): Promise<
	HttpResponse<ListarOrdensServicoResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const resultado = await listarOrdensServico({
		idempresa,
		page,
		limit,
	});

	const total = resultado.total ?? 0;
	const totalPages = Math.ceil(total / limit);

	return httpOk<ListarOrdensServicoResposta>({
		data: resultado.ordenservicos,
		paginacao: {
			page,
			limit,
			total,
			totalPages,
		},
	});
}

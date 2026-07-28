import type { HttpResponse } from "@/model/http-model.js";
import type { OrdemServico } from "@/model/ordem-servico-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	type ListarOrdensServicoParametros,
	listarOrdensServico,
} from "@/repositories/ordem-servico-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

type ListarOrdensServicoServiceParametros = ListarOrdensServicoParametros & {
	idusuario: string;
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
	...filtros
}: ListarOrdensServicoServiceParametros): Promise<
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
		...filtros,
	});

	const total = resultado.total ?? 0;
	const totalPages = Math.ceil(total / limit) || 1;

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

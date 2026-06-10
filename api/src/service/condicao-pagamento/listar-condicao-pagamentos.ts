import type { CondicaoPagamento } from "@/model/condicao-pagamento-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { listarCondicoesPagamento } from "@/repositories/condicao-pagamento-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

type ListarCondicaoPagamentosParametros = {
	idusuario: string;
	idempresa: string;
	descricao?: string | undefined;
	inativo?: number | undefined;
	page?: number;
	limit?: number;
};

type ListarCondicaoPagamentosResposta = {
	data: CondicaoPagamento[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarCondicaoPagamentosService({
	idusuario,
	idempresa,
	descricao,
	inativo,
	page = 1,
	limit = 10,
}: ListarCondicaoPagamentosParametros): Promise<
	HttpResponse<ListarCondicaoPagamentosResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const resultado = await listarCondicoesPagamento({
		idempresa,
		descricao,
		inativo,
		page,
		limit,
	});

	const total = resultado.total ?? 0;
	const totalPages = Math.ceil(total / limit);

	return httpOk<ListarCondicaoPagamentosResposta>({
		data: resultado.condicoespagamento,
		paginacao: {
			page,
			limit,
			total,
			totalPages,
		},
	});
}

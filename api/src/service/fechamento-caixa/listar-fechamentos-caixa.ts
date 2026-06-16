import type { FechamentoCaixa } from "@/model/fechamento-caixa-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { listarFechamentosCaixa } from "@/repositories/fechamento-caixa-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

type ListarFechamentosCaixaParametros = {
	idusuario: string;
	idempresa: string;
	codigo?: string | undefined;
	idusuarioCaixa?: string | undefined;
	pdv?: number | undefined;
	status?: number | undefined;
	page?: number;
	limit?: number;
};

type ListarFechamentosCaixaResposta = {
	data: FechamentoCaixa[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarFechamentosCaixaService({
	idusuario,
	idempresa,
	codigo,
	idusuarioCaixa,
	pdv,
	status,
	page = 1,
	limit = 10,
}: ListarFechamentosCaixaParametros): Promise<
	HttpResponse<ListarFechamentosCaixaResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const { fechamentosCaixa, total } = await listarFechamentosCaixa({
		idempresa,
		codigo,
		idusuario: idusuarioCaixa,
		pdv,
		status,
		page,
		limit,
	});

	const totalPages = Math.ceil(total / limit);

	return httpOk<ListarFechamentosCaixaResposta>({
		data: fechamentosCaixa,
		paginacao: {
			page,
			limit,
			total,
			totalPages,
		},
	});
}

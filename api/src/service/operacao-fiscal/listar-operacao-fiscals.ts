import type { HttpResponse } from "@/model/http-model.js";
import type { OperacaoFiscal } from "@/model/operacao-fiscal-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { listarOperacoesFiscais } from "@/repositories/operacao-fiscal-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

type ListarOperacaoFiscalsParametros = {
	idusuario: string;
	idempresa: string;
	nome?: string | undefined;
	page?: number;
	limit?: number;
};

type ListarOperacaoFiscalsResposta = {
	data: OperacaoFiscal[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarOperacaoFiscalsService({
	idusuario,
	idempresa,
	nome,
	page = 1,
	limit = 10,
}: ListarOperacaoFiscalsParametros): Promise<
	HttpResponse<ListarOperacaoFiscalsResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const resultado = await listarOperacoesFiscais({
		idempresa,
		nome,
		page,
		limit,
	});

	const total = resultado.total ?? 0;
	const totalPages = Math.ceil(total / limit);

	return httpOk<ListarOperacaoFiscalsResposta>({
		data: resultado.operacoesfiscais,
		paginacao: {
			page,
			limit,
			total,
			totalPages,
		},
	});
}

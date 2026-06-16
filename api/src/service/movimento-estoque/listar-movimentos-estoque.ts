import type { HttpResponse } from "@/model/http-model.js";
import type { MovimentoEstoque } from "@/model/movimento-estoque-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { listarMovimentosEstoque } from "@/repositories/movimento-estoque-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

type ListarMovimentosEstoqueParametros = {
	idusuario: string;
	idempresa: string;
	idproduto?: string | undefined;
	idlocalestoque?: string | undefined;
	tipodocumento?: number | undefined;
	observacao?: string | undefined;
	page?: number;
	limit?: number;
};

type ListarMovimentosEstoqueResposta = {
	data: MovimentoEstoque[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarMovimentosEstoqueService({
	idusuario,
	idempresa,
	idproduto,
	idlocalestoque,
	tipodocumento,
	observacao,
	page = 1,
	limit = 10,
}: ListarMovimentosEstoqueParametros): Promise<
	HttpResponse<ListarMovimentosEstoqueResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const resultado = await listarMovimentosEstoque({
		idempresa,
		idproduto,
		idlocalestoque,
		tipodocumento,
		observacao,
		page,
		limit,
	});

	const total = resultado.total ?? 0;
	const totalPages = Math.ceil(total / limit);

	return httpOk<ListarMovimentosEstoqueResposta>({
		data: resultado.movimentos,
		paginacao: {
			page,
			limit,
			total,
			totalPages,
		},
	});
}


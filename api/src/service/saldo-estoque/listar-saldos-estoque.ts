import type { HttpResponse } from "@/model/http-model.js";
import type { SaldoEstoque } from "@/model/saldo-estoque-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { listarSaldosEstoque } from "@/repositories/saldo-estoque-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

type ListarSaldosEstoqueParametros = {
	idusuario: string;
	idempresa: string;
	nomeproduto?: string | undefined;
	codigoproduto?: string | undefined;
	idfilial?: number | undefined;
	idproduto?: number | undefined;
	page?: number;
	limit?: number;
};

type ListarSaldosEstoqueResposta = {
	data: SaldoEstoque[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarSaldosEstoqueService({
	idusuario,
	idempresa,
	nomeproduto,
	codigoproduto,
	idfilial,
	idproduto,
	page = 1,
	limit = 10,
}: ListarSaldosEstoqueParametros): Promise<
	HttpResponse<ListarSaldosEstoqueResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const { saldosEstoque, total } = await listarSaldosEstoque({
		idempresa,
		nomeproduto,
		codigoproduto,
		idfilial,
		idproduto,
		page,
		limit,
	});

	const totalPages = Math.ceil(total / limit);

	return httpOk<ListarSaldosEstoqueResposta>({
		data: saldosEstoque,
		paginacao: {
			page,
			limit,
			total,
			totalPages,
		},
	});
}

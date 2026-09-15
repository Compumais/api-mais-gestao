import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	listarEstoqueGestaoPorProdutos,
	type OrdenarEstoqueSaldosCampo,
} from "@/repositories/estoque-gestao-repositories.js";
import { listarMovimentosEstoque } from "@/repositories/movimento-estoque-repositories.js";
import { buscarProdutoPorCodigoOuEan } from "@/repositories/produtos-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

export type SaldoEstoqueComDivergencia = {
	id: number | null;
	idproduto: string;
	idempresa: string;
	codigoproduto: string | null;
	nomeproduto: string | null;
	quantidade: string;
	quantidadefiscal: string;
	divergencia: string;
	ncm: string | null;
	unidademedida: string | null;
	possuiSaldo: boolean;
};

type ListarSaldosEstoqueGestaoParametros = {
	idempresa: string;
	idusuario: string;
	busca?: string | undefined;
	codigoproduto?: string | undefined;
	nomeproduto?: string | undefined;
	ncm?: string | undefined;
	unidademedida?: string | undefined;
	somenteDivergencia?: boolean | undefined;
	ordenarPor?: OrdenarEstoqueSaldosCampo | undefined;
	ordem?: "asc" | "desc" | undefined;
	page?: number;
	limit?: number;
};

function calcularDivergencia(
	operacional: string | null | undefined,
	fiscal: string | null | undefined,
): string {
	const op = Number.parseFloat(operacional ?? "0");
	const fi = Number.parseFloat(fiscal ?? "0");
	if (Number.isNaN(op) || Number.isNaN(fi)) return "0";
	return (op - fi).toFixed(6);
}

export async function listarSaldosEstoqueGestaoService({
	idempresa,
	idusuario,
	busca,
	codigoproduto,
	nomeproduto,
	ncm,
	unidademedida,
	somenteDivergencia,
	ordenarPor,
	ordem,
	page = 1,
	limit = 20,
}: ListarSaldosEstoqueGestaoParametros): Promise<
	HttpResponse<{
		data: SaldoEstoqueComDivergencia[];
		paginacao: { page: number; limit: number; total: number; totalPages: number };
	}>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const { itens, total } = await listarEstoqueGestaoPorProdutos({
		idempresa,
		busca,
		codigoproduto,
		nomeproduto,
		ncm,
		unidademedida,
		somenteDivergencia,
		ordenarPor,
		ordem,
		page,
		limit,
	});

	const data = itens.map((item) => {
		const quantidade = item.quantidade ?? "0";
		const quantidadefiscal = item.quantidadefiscal ?? "0";

		return {
			id: item.idsaldo,
			idproduto: item.idproduto,
			idempresa: item.idempresa,
			codigoproduto: item.codigoproduto,
			nomeproduto: item.nomeproduto,
			quantidade,
			quantidadefiscal,
			divergencia: calcularDivergencia(quantidade, quantidadefiscal),
			ncm: item.ncm,
			unidademedida: item.unidademedida,
			possuiSaldo: item.idsaldo != null,
		};
	});

	return httpOk({
		data,
		paginacao: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit) || 1,
		},
	});
}

type ListarMovimentosEstoqueGestaoParametros = {
	idempresa: string;
	idusuario: string;
	idproduto?: string | undefined;
	codigoproduto?: string | undefined;
	tipoestoque?: number | undefined;
	page?: number;
	limit?: number;
};

export async function listarMovimentosEstoqueGestaoService({
	idempresa,
	idusuario,
	idproduto,
	codigoproduto,
	tipoestoque,
	page = 1,
	limit = 20,
}: ListarMovimentosEstoqueGestaoParametros) {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	let idprodutoFiltro = idproduto;

	if (!idprodutoFiltro && codigoproduto) {
		const codigo = Number.parseInt(codigoproduto, 10);
		if (!Number.isNaN(codigo)) {
			const produto = await buscarProdutoPorCodigoOuEan(idempresa, codigo);
			idprodutoFiltro = produto?.id;
		}
	}

	const { movimentos, total } = await listarMovimentosEstoque({
		idempresa,
		idproduto: idprodutoFiltro,
		tipoestoque,
		page,
		limit,
	});

	return httpOk({
		data: movimentos,
		paginacao: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit) || 1,
		},
	});
}

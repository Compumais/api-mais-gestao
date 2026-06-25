import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { listarMovimentosEstoque } from "@/repositories/movimento-estoque-repositories.js";
import { buscarProdutoPorCodigoOuEan } from "@/repositories/produtos-repositories.js";
import { listarSaldosEstoque } from "@/repositories/saldo-estoque-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

export type SaldoEstoqueComDivergencia = {
	id: number;
	idempresa: string;
	codigoproduto: string | null;
	nomeproduto: string | null;
	quantidade: string | null;
	quantidadefiscal: string | null;
	divergencia: string;
	ncm: string | null;
	unidademedida: string | null;
};

type ListarSaldosEstoqueGestaoParametros = {
	idempresa: string;
	idusuario: string;
	busca?: string | undefined;
	somenteDivergencia?: boolean | undefined;
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
	somenteDivergencia,
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

	const { saldosEstoque, total } = await listarSaldosEstoque({
		idempresa,
		nomeproduto: busca,
		page,
		limit: somenteDivergencia ? 500 : limit,
	});

	let data = saldosEstoque.map((saldo) => ({
		id: saldo.id,
		idempresa: saldo.idempresa,
		codigoproduto: saldo.codigoproduto,
		nomeproduto: saldo.nomeproduto,
		quantidade: saldo.quantidade,
		quantidadefiscal: saldo.quantidadefiscal ?? "0",
		divergencia: calcularDivergencia(saldo.quantidade, saldo.quantidadefiscal),
		ncm: saldo.ncm,
		unidademedida: saldo.unidademedida,
	}));

	if (somenteDivergencia) {
		data = data.filter((item) => Number.parseFloat(item.divergencia) !== 0);
		const offset = (page - 1) * limit;
		const paginado = data.slice(offset, offset + limit);
		return httpOk({
			data: paginado,
			paginacao: {
				page,
				limit,
				total: data.length,
				totalPages: Math.ceil(data.length / limit) || 1,
			},
		});
	}

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

import type { HttpResponse } from "@/model/http-model.js";
import type { Lote } from "@/model/lote-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { listarLotesPorProduto } from "@/repositories/lote-repositories.js";
import {
	buscarProdutoPorCodigoOuEan,
	buscarProdutoPorId,
} from "@/repositories/produtos-repositories.js";
import { buscarSaldoEstoquePorCodigoProduto } from "@/repositories/saldo-estoque-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

export type LoteProdutoResposta = Lote & { vencido: boolean };

export type ListarLotesProdutoResposta = {
	idproduto: string;
	lotes: LoteProdutoResposta[];
	saldoOrfao: number;
	controlalote: number;
	controlavalidade: number;
};

function parseQtd(valor: string | null | undefined): number {
	return Number.parseFloat(valor ?? "0") || 0;
}

export async function listarLotesProdutoService(params: {
	idusuario: string;
	idempresa: string;
	idproduto?: string | undefined;
	codigoproduto?: string | undefined;
}): Promise<HttpResponse<ListarLotesProdutoResposta>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		params.idusuario,
		params.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	let idproduto = params.idproduto;
	if (!idproduto && params.codigoproduto) {
		const codigo = Number.parseInt(params.codigoproduto, 10);
		if (!Number.isNaN(codigo)) {
			const encontrado = await buscarProdutoPorCodigoOuEan(
				params.idempresa,
				codigo,
			);
			idproduto = encontrado?.id;
		}
	}

	if (!idproduto) {
		return httpNaoEncontrado();
	}

	const produto = await buscarProdutoPorId(idproduto);
	if (!produto || produto.idempresa !== params.idempresa) {
		return httpNaoEncontrado();
	}

	const lotes = await listarLotesPorProduto(params.idempresa, idproduto);
	const hoje = new Date().toISOString().slice(0, 10);
	const somaLotes = lotes.reduce(
		(acc, lote) => acc + parseQtd(lote.quantidade),
		0,
	);

	let saldoProduto = 0;
	if (produto.codigo != null) {
		const saldo = await buscarSaldoEstoquePorCodigoProduto(
			params.idempresa,
			String(produto.codigo),
		);
		saldoProduto = parseQtd(saldo?.quantidade);
	}

	return httpOk({
		idproduto,
		lotes: lotes.map((lote) => ({
			...lote,
			vencido: Boolean(lote.datavalidade && lote.datavalidade < hoje),
		})),
		saldoOrfao: Math.max(0, Number((saldoProduto - somaLotes).toFixed(6))),
		controlalote: produto.controlalote ?? 0,
		controlavalidade: produto.controlavalidade ?? 0,
	});
}

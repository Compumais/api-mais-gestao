import type { HttpResponse } from "@/model/http-model.js";
import type { Produto } from "@/model/produto-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarProdutoPorId } from "@/repositories/produtos-repositories.js";
import { buscarSaldoEstoquePorCodigoProduto } from "@/repositories/saldo-estoque-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

export type ProdutoComEstoque = Produto & { estoque: number | null };

type BuscarProdutoParametros = {
	produtoId: string;
	idusuario: string;
};

export async function buscarProdutoService({
	produtoId,
	idusuario,
}: BuscarProdutoParametros): Promise<HttpResponse<ProdutoComEstoque | null>> {
	const registro = await buscarProdutoPorId(produtoId);

	if (!registro) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		registro.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	let estoque: number | null = null;

	if (registro.codigo != null) {
		const saldo = await buscarSaldoEstoquePorCodigoProduto(
			registro.idempresa,
			String(registro.codigo),
		);

		if (saldo?.quantidade != null) {
			const quantidade = Number.parseFloat(saldo.quantidade);
			estoque = Number.isNaN(quantidade) ? null : quantidade;
		}
	}

	return httpOk<ProdutoComEstoque>({ ...registro, estoque });
}

import type { Produto } from "@/model/produto-model.js";
import {
	atualizarSaldoEstoque,
	buscarSaldoEstoquePorCodigoProduto,
	criarSaldoEstoque,
} from "@/repositories/saldo-estoque-repositories.js";

type SincronizarSaldoEstoqueProdutoParametros = {
	idempresa: string;
	produto: Pick<Produto, "codigo" | "nome" | "ncm" | "unidademedida">;
	quantidade: number;
	/**
	 * Quando informado no cadastro inicial, alinha o fiscal ao operacional.
	 * Em atualização de produto existente, o padrão é preservar o fiscal.
	 */
	sincronizarFiscal?: boolean | undefined;
};

export async function sincronizarSaldoEstoqueProduto({
	idempresa,
	produto,
	quantidade,
	sincronizarFiscal,
}: SincronizarSaldoEstoqueProdutoParametros) {
	if (produto.codigo == null) return;

	const codigo = String(produto.codigo);
	const dataIso = new Date().toISOString().split("T")[0];
	const qtdStr = Math.max(0, quantidade).toFixed(6);
	const agora = Date.now();

	const dadosComuns = {
		nomeproduto: produto.nome ?? null,
		ncm: produto.ncm ?? null,
		unidademedida: produto.unidademedida ?? null,
		ultimaalteracao: dataIso,
		currenttimemillis: agora,
	};

	const saldo = await buscarSaldoEstoquePorCodigoProduto(idempresa, codigo);

	if (saldo) {
		const deveSincronizarFiscal = sincronizarFiscal === true;
		await atualizarSaldoEstoque(saldo.id, {
			...dadosComuns,
			quantidade: qtdStr,
			...(deveSincronizarFiscal ? { quantidadefiscal: qtdStr } : {}),
		});
		return;
	}

	// Saldo novo: operacional e fiscal começam iguais (entrada inicial sem divergência).
	await criarSaldoEstoque({
		idempresa,
		codigoproduto: codigo,
		...dadosComuns,
		quantidade: qtdStr,
		quantidadefiscal: qtdStr,
	});
}

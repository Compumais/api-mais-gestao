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
};

export async function sincronizarSaldoEstoqueProduto({
	idempresa,
	produto,
	quantidade,
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
		await atualizarSaldoEstoque(saldo.id, {
			...dadosComuns,
			quantidade: qtdStr,
		});
		return;
	}

	await criarSaldoEstoque({
		idempresa,
		codigoproduto: codigo,
		...dadosComuns,
		quantidade: qtdStr,
		quantidadefiscal: "0",
	});
}

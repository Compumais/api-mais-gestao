import { listarMovimentosEstoquePorIdOriginal } from "@/repositories/movimento-estoque-repositories.js";
import { TIPO_DOCUMENTO_ESTOQUE, TIPO_ESTOQUE, type TipoEstoque } from "@/util/tipo-estoque.js";
import type { ItemBaixaEstoqueVenda } from "@/service/estoque/baixa-estoque-venda.js";
import { registrarMovimentoEstoque } from "@/service/estoque/registrar-movimento-estoque.js";

type ReajustarEstoqueVendaPdvParametros = {
	idempresa: string;
	idvenda: string;
	itensNovos: ItemBaixaEstoqueVenda[];
	tipoestoque?: TipoEstoque;
};

function parseQuantidade(valor: string): number {
	const qtd = Number.parseFloat(valor);
	return Number.isNaN(qtd) ? 0 : qtd;
}

export async function reajustarEstoqueVendaPdv({
	idempresa,
	idvenda,
	itensNovos,
	tipoestoque = TIPO_ESTOQUE.AMBOS,
}: ReajustarEstoqueVendaPdvParametros): Promise<number> {
	const movimentos = await listarMovimentosEstoquePorIdOriginal(idvenda);
	let movimentosRegistrados = 0;

	for (const movimento of movimentos) {
		if (movimento.cancelado) continue;

		const qtySaida = parseQuantidade(movimento.quantidadesaida ?? "0");
		if (qtySaida <= 0 || !movimento.idproduto) continue;

		const tipo =
			movimento.tipoestoque != null
				? (movimento.tipoestoque as TipoEstoque)
				: tipoestoque;

		const estorno = await registrarMovimentoEstoque({
			idempresa,
			idproduto: movimento.idproduto,
			quantidade: qtySaida.toFixed(6),
			sentido: "entrada",
			tipoestoque: tipo,
			tipodocumento: TIPO_DOCUMENTO_ESTOQUE.PDV,
			idoriginal: idvenda,
			iditemoriginal: movimento.idproduto,
			observacao: "Estorno edição venda PDV",
		});

		if (estorno) movimentosRegistrados++;
	}

	for (const item of itensNovos) {
		const qty = parseQuantidade(item.quantidade);
		if (qty <= 0) continue;

		const precoUnit = Number.parseFloat(item.precounitario);
		const valorTotal = (qty * (Number.isNaN(precoUnit) ? 0 : precoUnit)).toFixed(2);

		const movimento = await registrarMovimentoEstoque({
			idempresa,
			idproduto: item.idproduto,
			quantidade: qty.toFixed(6),
			sentido: "saida",
			tipoestoque,
			tipodocumento: TIPO_DOCUMENTO_ESTOQUE.PDV,
			idoriginal: idvenda,
			iditemoriginal: item.idproduto,
			valortotal: valorTotal,
		});

		if (movimento) movimentosRegistrados++;
	}

	return movimentosRegistrados;
}

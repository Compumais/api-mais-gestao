import { listarMovimentosEstoquePorIdOriginal } from "@/repositories/movimento-estoque-repositories.js";
import {
	TIPO_DOCUMENTO_ESTOQUE,
	TIPO_ESTOQUE,
	tipoEstoqueAfetouFiscal,
} from "@/util/tipo-estoque.js";
import type { ItemBaixaEstoqueVenda } from "./baixa-estoque-venda.js";
import { registrarMovimentoEstoque } from "./registrar-movimento-estoque.js";

/**
 * Complementa a baixa fiscal após NFC-e autorizada.
 * A venda PDV já baixou só o operacional; o fiscal só cai com documento efetivo.
 */
export async function complementarBaixaFiscalVendaPdv(params: {
	idempresa: string;
	idvenda: string;
	itens: ItemBaixaEstoqueVenda[];
}): Promise<{ movimentosRegistrados: number; avisos: string[] }> {
	const avisos: string[] = [];
	let movimentosRegistrados = 0;

	const movimentos = await listarMovimentosEstoquePorIdOriginal(params.idvenda);
	const itensComFiscal = new Set(
		movimentos
			.filter(
				(movimento) =>
					(movimento.cancelado ?? 0) === 0 &&
					movimento.iditemoriginal &&
					tipoEstoqueAfetouFiscal(movimento.tipoestoque),
			)
			.map((movimento) => movimento.iditemoriginal as string),
	);

	for (const item of params.itens) {
		const qty = Number.parseFloat(item.quantidade);
		if (Number.isNaN(qty) || qty <= 0) continue;
		if (itensComFiscal.has(item.idproduto)) {
			movimentosRegistrados++;
			continue;
		}

		const precoUnit = Number.parseFloat(item.precounitario);
		const valorTotal = (
			qty * (Number.isNaN(precoUnit) ? 0 : precoUnit)
		).toFixed(2);

		try {
			const movimento = await registrarMovimentoEstoque({
				idempresa: params.idempresa,
				idproduto: item.idproduto,
				quantidade: qty.toFixed(6),
				sentido: "saida",
				tipoestoque: TIPO_ESTOQUE.FISCAL,
				tipodocumento: TIPO_DOCUMENTO_ESTOQUE.PDV,
				idoriginal: params.idvenda,
				iditemoriginal: item.idproduto,
				valortotal: valorTotal,
				observacao: "Baixa fiscal NFC-e",
				permitirSemLote: true,
			});
			if (movimento) movimentosRegistrados++;
		} catch (erro) {
			console.error(
				`[estoque] Falha ao complementar baixa fiscal do produto ${item.nomeproduto ?? item.idproduto}:`,
				erro,
			);
			avisos.push(
				`Falha na baixa fiscal: ${item.nomeproduto ?? item.idproduto}`,
			);
		}
	}

	return { movimentosRegistrados, avisos };
}

/**
 * Lógica de baixa de estoque para o PDV.
 *
 * Ao finalizar uma venda, para cada item:
 *  1. Registra um movimento de saída em `movimentoestoque` (tipodocumento=0 = PDV).
 *  2. Atualiza o saldo em `saldoestoque` subtraindo a quantidade vendida,
 *     localizando o registro pelo `codigoproduto` (campo legado `codigo` do produto).
 *     Se o saldo não for encontrado, apenas o movimento é registrado.
 */

import {
	movimentoEstoqueService,
	TIPO_DOCUMENTO_ESTOQUE,
} from "@/services/movimento-estoque.service";
import { saldoEstoqueService } from "@/services/saldo-estoque.service";

interface ItemBaixa {
	idproduto: string; // UUID do produto
	nomeproduto: string;
	quantidade: string; // ex: "1.000"
	precounitario: string; // ex: "29.90"
	codigo?: number | null; // código numérico do produto (para localizar saldo legado)
}

interface BaixaEstoqueParams {
	idempresa: string;
	idvenda: string; // ID da venda gerada, usado como idoriginal no movimento
	itens: ItemBaixa[];
}

/**
 * Registra a saída de estoque para cada item da venda.
 * Falhas individuais são logadas mas não interrompem o restante dos registros,
 * pois a venda já foi criada com sucesso.
 */
export async function baixarEstoqueVenda({
	idempresa,
	idvenda,
	itens,
}: BaixaEstoqueParams): Promise<void> {
	const agora = new Date();
	const dataIso = agora.toISOString().split("T")[0]; // "YYYY-MM-DD"
	const dataHoraIso = agora.toISOString().replace("T", " ").replace("Z", ""); // "YYYY-MM-DD HH:mm:ss.mmm"

	for (const item of itens) {
		const qty = Number.parseFloat(item.quantidade);
		if (Number.isNaN(qty) || qty <= 0) continue;

		const precoUnit = Number.parseFloat(item.precounitario);
		const valorTotal = (qty * precoUnit).toFixed(2);

		// 1. Registrar movimento de saída
		try {
			await movimentoEstoqueService.criar({
				idempresa,
				idproduto: item.idproduto,
				quantidadesaida: qty.toFixed(6),
				quantidadeentrada: null,
				tipodocumento: TIPO_DOCUMENTO_ESTOQUE.PDV,
				data: dataIso,
				datahora: dataHoraIso,
				idoriginal: idvenda,
				iditemoriginal: item.idproduto,
				valortotal: valorTotal,
				currenttimemillis: agora.getTime(),
				cancelado: 0,
			});
		} catch (err) {
			console.error(
				`[estoque] Falha ao registrar movimento para produto ${item.nomeproduto}:`,
				err,
			);
		}

		// 2. Atualizar saldo (busca pelo código numérico do produto)
		if (!item.codigo) continue;

		try {
			const saldos = await saldoEstoqueService.listar({
				idempresa,
				codigoproduto: String(item.codigo),
				limit: 1,
			});

			const saldo = saldos.data[0];
			if (!saldo) continue;

			const saldoAtual = Number.parseFloat(saldo.quantidade ?? "0");
			const novoSaldo = Math.max(0, saldoAtual - qty);

			await saldoEstoqueService.atualizar(saldo.id, {
				quantidade: novoSaldo.toFixed(6),
				ultimaalteracao: dataIso,
			});
		} catch (err) {
			console.error(
				`[estoque] Falha ao atualizar saldo para produto ${item.nomeproduto}:`,
				err,
			);
		}
	}
}

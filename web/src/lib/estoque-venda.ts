/**
 * Baixa de estoque via API centralizada (operacional + fiscal conforme regra NFC-e).
 */

import { toast } from "sonner";
import {
	avaliarResultadoBaixaEstoque,
	BaixaEstoqueVendaError,
	obterMotivoFalhaNfceResultado,
} from "@/lib/avaliar-resultado-baixa-estoque";
import {
	estoqueGestaoService,
	type ResultadoBaixaEstoqueVenda,
} from "@/services/estoque-gestao.service";

interface ItemBaixa {
	idproduto: string;
	nomeproduto: string;
	quantidade: string;
	precounitario: string;
	codigo?: number | null;
}

interface BaixaEstoqueParams {
	idempresa: string;
	idvenda: string;
	itens: ItemBaixa[];
	pagamentos?: {
		valordinheiro?: string | null;
		valorcartao?: string | null;
		valorpix?: string | null;
		valorprepago?: string | null;
		valortroco?: string | null;
		valortotal?: string | null;
	};
}

function notificarAvisos(resultado: ResultadoBaixaEstoqueVenda) {
	const avaliacao = avaliarResultadoBaixaEstoque(resultado);

	for (const aviso of avaliacao.falhasEstoque) {
		toast.error(aviso);
	}

	if (avaliacao.falhaNfce) {
		toast.error(
			`Falha na NFC-e: ${obterMotivoFalhaNfceResultado(resultado)}`,
		);
	}

	for (const aviso of avaliacao.outrosAvisos) {
		toast.warning(aviso);
	}
}

export async function baixarEstoqueVenda({
	idempresa,
	idvenda,
	itens,
	pagamentos = {},
}: BaixaEstoqueParams): Promise<ResultadoBaixaEstoqueVenda> {
	const resultado = await estoqueGestaoService.baixaVenda({
		idempresa,
		idvenda,
		itens: itens.map((item) => ({
			idproduto: item.idproduto,
			quantidade: item.quantidade,
			precounitario: item.precounitario,
			nomeproduto: item.nomeproduto,
		})),
		pagamentos,
	});

	const avaliacao = avaliarResultadoBaixaEstoque(resultado);
	notificarAvisos(resultado);

	if (!avaliacao.sucessoCompleto && avaliacao.mensagemErro) {
		throw new BaixaEstoqueVendaError(avaliacao.mensagemErro);
	}

	return resultado;
}

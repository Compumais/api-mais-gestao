import type { CotacaoCompraPublica } from "@/model/cotacao-compra-model.js";
import { STATUS_COTACAO_COMPRA } from "@/model/cotacao-compra-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	buscarCotacaoCompraPorToken,
	listarItensCotacaoCompraEnriquecidos,
} from "@/repositories/cotacao-compra-repositories.js";
import { httpBadRequest, httpNaoEncontrado, httpOk } from "@/util/http-util.js";

function validadeVencida(validade: string | null) {
	if (!validade) return false;
	const hoje = new Date();
	hoje.setHours(0, 0, 0, 0);
	const dataValidade = new Date(`${validade}T00:00:00`);
	return dataValidade < hoje;
}

export async function buscarCotacaoCompraPublicaService(
	token: string,
): Promise<HttpResponse<CotacaoCompraPublica>> {
	const cotacao = await buscarCotacaoCompraPorToken(token);
	if (!cotacao) {
		return httpNaoEncontrado();
	}

	if (cotacao.status !== STATUS_COTACAO_COMPRA.ABERTA) {
		return httpBadRequest("Esta cotação não está mais aberta para propostas");
	}

	if (validadeVencida(cotacao.validade)) {
		return httpBadRequest("O prazo desta cotação já encerrou");
	}

	const itens = await listarItensCotacaoCompraEnriquecidos(cotacao.id);

	return httpOk<CotacaoCompraPublica>({
		id: cotacao.id,
		titulo: cotacao.titulo,
		observacao: cotacao.observacao,
		validade: cotacao.validade,
		itens: itens.map((item) => ({
			id: item.id,
			idproduto: item.idproduto,
			descricao: item.descricao,
			quantidade: item.quantidade,
			unidademedida: item.unidademedida,
			observacao: item.observacao,
			ordem: item.ordem,
			codigoproduto: item.codigoproduto,
			nomeproduto: item.nomeproduto,
			descricaoproduto: item.descricaoproduto,
		})),
	});
}

export function cotacaoPublicaAceitaPropostas(
	status: string,
	validade: string | null,
) {
	return status === STATUS_COTACAO_COMPRA.ABERTA && !validadeVencida(validade);
}

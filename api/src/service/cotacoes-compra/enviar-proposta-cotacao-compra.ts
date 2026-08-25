import { v4 as uuidv4 } from "uuid";
import type { CotacaoCompraProposta } from "@/model/cotacao-compra-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	buscarCotacaoCompraPorToken,
	buscarPropostaPorCotacaoETelefone,
	listarItensCotacaoCompraEnriquecidos,
	upsertPropostaCotacao,
} from "@/repositories/cotacao-compra-repositories.js";
import {
	httpBadRequest,
	httpCriacao,
	httpErroInterno,
	httpNaoEncontrado,
} from "@/util/http-util.js";
import { cotacaoPublicaAceitaPropostas } from "./buscar-cotacao-compra-publica.js";

export function normalizarTelefone(telefone: string) {
	return telefone.replace(/\D/g, "");
}

type EnviarPropostaParametros = {
	token: string;
	nome: string;
	telefone: string;
	itens: Array<{ idcotacaoitem: string; precounitario: number }>;
};

export async function enviarPropostaCotacaoCompraService({
	token,
	nome,
	telefone,
	itens,
}: EnviarPropostaParametros): Promise<HttpResponse<CotacaoCompraProposta>> {
	const cotacao = await buscarCotacaoCompraPorToken(token);
	if (!cotacao) {
		return httpNaoEncontrado();
	}

	if (!cotacaoPublicaAceitaPropostas(cotacao.status, cotacao.validade)) {
		return httpBadRequest("Esta cotação não está mais aberta para propostas");
	}

	const telefoneNormalizado = normalizarTelefone(telefone);
	if (telefoneNormalizado.length < 10) {
		return httpBadRequest("Informe um telefone válido com DDD");
	}

	const nomeTrim = nome.trim();
	if (nomeTrim.length < 2) {
		return httpBadRequest("Informe o nome do fornecedor");
	}

	const itensCotacao = await listarItensCotacaoCompraEnriquecidos(cotacao.id);
	if (itensCotacao.length === 0) {
		return httpBadRequest("A cotação não possui itens");
	}

	const precosPorItem = new Map(
		itens.map((item) => [item.idcotacaoitem, item.precounitario]),
	);

	for (const itemCotacao of itensCotacao) {
		const preco = precosPorItem.get(itemCotacao.id);
		if (preco === undefined || !Number.isFinite(preco) || preco <= 0) {
			return httpBadRequest(
				"Informe o preço de todos os itens, com valor maior que zero",
			);
		}
	}

	if (precosPorItem.size !== itensCotacao.length) {
		return httpBadRequest("A proposta contém itens que não pertencem à cotação");
	}

	const existente = await buscarPropostaPorCotacaoETelefone(
		cotacao.id,
		telefoneNormalizado,
	);

	const propostaId = existente?.id ?? uuidv4();
	const proposta = await upsertPropostaCotacao(
		{
			id: propostaId,
			idcotacao: cotacao.id,
			nome: nomeTrim,
			telefone: telefoneNormalizado,
			currenttimemillis: Date.now(),
		},
		itensCotacao.map((item) => ({
			id: uuidv4(),
			idproposta: propostaId,
			idcotacaoitem: item.id,
			precounitario: Number(precosPorItem.get(item.id)).toFixed(2),
		})),
		existente?.id,
	);

	if (!proposta) {
		return httpErroInterno();
	}

	return httpCriacao<CotacaoCompraProposta>(proposta);
}

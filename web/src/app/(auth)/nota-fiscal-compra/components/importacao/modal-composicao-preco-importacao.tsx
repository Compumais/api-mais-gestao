"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { ModalComposicaoPreco } from "@/components/composicao-preco/modal-composicao-preco";
import {
	estadoComposicaoPadrao,
	type EstadoComposicaoPreco,
} from "@/components/composicao-preco/tipos";
import {
	type DadosImportacaoItem,
	type NotaFiscalItemImportacao,
	notaFiscalService,
} from "@/services/nota-fiscal.service";
import {
	parseNumeroComposicao,
	produtoTemSubstituicaoTributaria,
} from "@/util/calcular-composicao-preco";

type ModalComposicaoPrecoImportacaoProps = {
	idempresa: string;
	idRascunho: string;
	item: NotaFiscalItemImportacao;
	aberto: boolean;
	onAbertoChange: (aberto: boolean) => void;
};

function montarEstadoInicial(
	dados: DadosImportacaoItem,
): EstadoComposicaoPreco {
	const trib = dados.tributacao;
	const rateio = dados.rateio ?? {};
	const freteSeguroDespesas =
		parseNumeroComposicao(rateio.frete) +
		parseNumeroComposicao(rateio.seguro) +
		parseNumeroComposicao(rateio.outras);

	return estadoComposicaoPadrao({
		basePrecoId: "precounitarioEstoque",
		desconto: rateio.desconto ?? "0",
		freteSeguroDespesas: freteSeguroDespesas.toFixed(2),
		icmsst: trib.icmsst ?? "0",
		fcpst: trib.fcpst ?? "0",
		percentualDiferencialIcms: trib.percentualdifericms ?? "0",
		percentualIcmsCredito: trib.percentualicms ?? "0",
		percentualIcmsSaida: trib.percentualicms ?? "0",
	});
}

export function ModalComposicaoPrecoImportacao({
	idempresa,
	idRascunho,
	item,
	aberto,
	onAbertoChange,
}: ModalComposicaoPrecoImportacaoProps) {
	const queryClient = useQueryClient();
	const dados = item.dadosimportacao;

	const estadoInicial = useMemo(
		() =>
			dados
				? montarEstadoInicial(dados)
				: estadoComposicaoPadrao({ basePrecoId: "precounitarioEstoque" }),
		[dados],
	);

	const basesPreco = useMemo(
		() => [
			{
				id: "precounitarioEstoque",
				label: "Preço estoque",
				valor: dados?.precounitarioEstoque,
			},
			{
				id: "precounitarioXml",
				label: "Preço XML",
				valor: dados?.precounitarioXml,
			},
		],
		[dados?.precounitarioEstoque, dados?.precounitarioXml],
	);

	const handleAplicar = useCallback(
		async (novoPreco: string, estado: EstadoComposicaoPreco) => {
			await notaFiscalService.atualizarItemRascunhoImportacao(
				idRascunho,
				item.id,
				{
					idempresa,
					precoVenda: novoPreco,
					tributacao: {
						...dados?.tributacao,
						percentualdifericms: estado.percentualDiferencialIcms,
					},
				},
			);
			await queryClient.invalidateQueries({
				queryKey: ["rascunho-importacao-nf", idRascunho],
			});
		},
		[dados?.tributacao, idRascunho, idempresa, item.id, queryClient],
	);

	if (!dados) {
		return null;
	}

	const nomeProduto =
		dados.produtoEncontrado?.nome ??
		dados.descricaoFornecedor ??
		item.descricao ??
		"Produto";

	const temST = produtoTemSubstituicaoTributaria(dados.tributacao);

	return (
		<ModalComposicaoPreco
			aberto={aberto}
			onAbertoChange={onAbertoChange}
			nomeProduto={nomeProduto}
			idproduto={dados.idproduto}
			origemCusto="Nota fiscal de compra"
			basesPreco={basesPreco}
			precoVendaAtual={dados.precoVenda}
			estadoInicial={estadoInicial}
			temST={temST}
			valorIpi={dados.tributacao.ipi}
			custoUltimaCompraFallback={dados.precounitarioEstoque}
			resumo={{
				quantidade:
					dados.quantidadeEstoque ?? dados.quantidadeXml ?? item.quantidade,
				fator: dados.fatorConversao ?? "1",
				totalItem: item.total,
			}}
			resetKey={item.id}
			onAplicar={handleAplicar}
		/>
	);
}

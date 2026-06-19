import type {
	DadosImportacaoItem,
	DadosImportacaoItemFinalizado,
} from "@/model/nota-fiscal-importacao-model.js";

export function montarSnapshotImportacaoItem(
	dados: DadosImportacaoItem,
	finalizadoEm: string,
): DadosImportacaoItemFinalizado {
	return {
		...dados,
		finalizadoEm,
		versao: 1,
		xmlItemSnapshot: {
			quantidadeXml: dados.quantidadeXml,
			precounitarioXml: dados.precounitarioXml,
			unidadeXml: dados.unidadeXml,
			totalXml: (
				parseFloat(dados.quantidadeXml || "0") *
				parseFloat(dados.precounitarioXml || "0")
			).toFixed(2),
			tributacaoXml: { ...dados.tributacao },
			rastrosXml: dados.rastrosXml ? [...dados.rastrosXml] : undefined,
		},
	};
}

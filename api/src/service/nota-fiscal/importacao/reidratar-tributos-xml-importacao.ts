import type { DadosImportacaoItem } from "@/model/nota-fiscal-importacao-model.js";
import type { NotaFiscal } from "@/model/nota-fiscal-model.js";
import type { NotaFiscalItem } from "@/model/nota-fiscal-item-model.js";
import {
	type ItemNFeXml,
	type NFeXmlParsed,
	parseNFeXml,
} from "@/util/nfe-xml-parser.js";

type CampoTributoCabecalho =
	| "baseicms"
	| "icms"
	| "ipi"
	| "pis"
	| "cofins";

function tributoVazio(valor: string | null | undefined): boolean {
	if (valor === null || valor === undefined || valor === "") {
		return true;
	}

	const numero = Number(String(valor).replace(",", "."));
	return !Number.isNaN(numero) && numero === 0;
}

function mesclarTributo(
	valorAtual: string | null | undefined,
	valorXml: string | undefined,
): string | null | undefined {
	if (!tributoVazio(valorAtual)) {
		return valorAtual;
	}

	return valorXml ?? valorAtual;
}

function montarTributacaoItem(itemXml: ItemNFeXml) {
	return {
		situacaotributaria: itemXml.situacaotributaria,
		cstpis: itemXml.cstpis,
		cstcofins: itemXml.cstcofins,
		baseicms: itemXml.baseicms,
		percentualicms: itemXml.percentualicms,
		icms: itemXml.icms,
		aliquotapis: itemXml.aliquotapis,
		aliquotacofins: itemXml.aliquotacofins,
		pis: itemXml.pis,
		cofins: itemXml.cofins,
		ipi: itemXml.ipi,
		origem: itemXml.origem,
	};
}

function tributacaoItemVazia(
	tributacao: DadosImportacaoItem["tributacao"] | undefined,
): boolean {
	if (!tributacao) {
		return true;
	}

	return (
		tributoVazio(tributacao.baseicms) &&
		tributoVazio(tributacao.icms) &&
		tributoVazio(tributacao.pis) &&
		tributoVazio(tributacao.cofins) &&
		tributoVazio(tributacao.ipi)
	);
}

export function reidratarTributosRascunhoImportacao(
	nota: NotaFiscal,
	itens: Array<NotaFiscalItem & { dadosimportacao: DadosImportacaoItem | null }>,
	xml: string,
): {
	nota: NotaFiscal;
	itens: Array<NotaFiscalItem & { dadosimportacao: DadosImportacaoItem | null }>;
} {
	let dadosXml: NFeXmlParsed;

	try {
		dadosXml = parseNFeXml(xml);
	} catch {
		return { nota, itens };
	}

	const notaReidratada: NotaFiscal = {
		...nota,
		chavenfe: mesclarTributo(nota.chavenfe, dadosXml.chavenfe) ?? nota.chavenfe,
		baseicms:
			mesclarTributo(nota.baseicms, dadosXml.baseicms) ?? nota.baseicms,
		icms: mesclarTributo(nota.icms, dadosXml.icms) ?? nota.icms,
		ipi: mesclarTributo(nota.ipi, dadosXml.ipi) ?? nota.ipi,
		pis: mesclarTributo(nota.pis, dadosXml.pis) ?? nota.pis,
		cofins: mesclarTributo(nota.cofins, dadosXml.cofins) ?? nota.cofins,
	};

	const itensReidratados = itens.map((item, indice) => {
		const itemXml = dadosXml.itens[indice];
		if (!itemXml) {
			return item;
		}

		const dadosAtuais = item.dadosimportacao;
		const tributacaoXml = montarTributacaoItem(itemXml);

		const dadosimportacao: DadosImportacaoItem = dadosAtuais
			? {
					...dadosAtuais,
					tributacao: tributacaoItemVazia(dadosAtuais.tributacao)
						? tributacaoXml
						: {
								...dadosAtuais.tributacao,
								situacaotributaria:
									dadosAtuais.tributacao.situacaotributaria ??
									tributacaoXml.situacaotributaria,
								cstpis:
									dadosAtuais.tributacao.cstpis ?? tributacaoXml.cstpis,
								cstcofins:
									dadosAtuais.tributacao.cstcofins ??
									tributacaoXml.cstcofins,
								baseicms:
									mesclarTributo(
										dadosAtuais.tributacao.baseicms,
										tributacaoXml.baseicms,
									) ?? dadosAtuais.tributacao.baseicms,
								percentualicms:
									dadosAtuais.tributacao.percentualicms ??
									tributacaoXml.percentualicms,
								icms:
									mesclarTributo(
										dadosAtuais.tributacao.icms,
										tributacaoXml.icms,
									) ?? dadosAtuais.tributacao.icms,
								aliquotapis:
									dadosAtuais.tributacao.aliquotapis ??
									tributacaoXml.aliquotapis,
								aliquotacofins:
									dadosAtuais.tributacao.aliquotacofins ??
									tributacaoXml.aliquotacofins,
								pis:
									mesclarTributo(
										dadosAtuais.tributacao.pis,
										tributacaoXml.pis,
									) ?? dadosAtuais.tributacao.pis,
								cofins:
									mesclarTributo(
										dadosAtuais.tributacao.cofins,
										tributacaoXml.cofins,
									) ?? dadosAtuais.tributacao.cofins,
								ipi:
									mesclarTributo(
										dadosAtuais.tributacao.ipi,
										tributacaoXml.ipi,
									) ?? dadosAtuais.tributacao.ipi,
								origem:
									dadosAtuais.tributacao.origem ?? tributacaoXml.origem,
							},
				}
			: {
					descricaoFornecedor: item.descricao ?? itemXml.descricaoproduto,
					statusVinculo: "pendente",
					confirmarCadastro: false,
					fatorConversao: "1",
					quantidadeXml: itemXml.quantidade ?? "0",
					quantidadeEstoque: item.quantidade ?? itemXml.quantidade ?? "0",
					precounitarioXml: itemXml.precounitario ?? "0",
					precounitarioEstoque: item.precounitario ?? itemXml.precounitario ?? "0",
					cfopXml: itemXml.cfop,
					ncmXml: itemXml.ncm,
					tributacao: tributacaoXml,
				};

		return {
			...item,
			situacaotributaria:
				item.situacaotributaria ?? itemXml.situacaotributaria ?? null,
			cstpis: item.cstpis ?? itemXml.cstpis ?? null,
			cstcofins: item.cstcofins ?? itemXml.cstcofins ?? null,
			baseicms:
				mesclarTributo(item.baseicms, itemXml.baseicms) ?? item.baseicms,
			percentualicms: item.percentualicms ?? itemXml.percentualicms ?? null,
			icms: mesclarTributo(item.icms, itemXml.icms) ?? item.icms,
			aliquotapis: item.aliquotapis ?? itemXml.aliquotapis ?? null,
			aliquotacofins: item.aliquotacofins ?? itemXml.aliquotacofins ?? null,
			pis: mesclarTributo(item.pis, itemXml.pis) ?? item.pis,
			cofins: mesclarTributo(item.cofins, itemXml.cofins) ?? item.cofins,
			ipi: mesclarTributo(item.ipi, itemXml.ipi) ?? item.ipi,
			origem: item.origem ?? itemXml.origem ?? 0,
			dadosimportacao,
		};
	});

	return {
		nota: notaReidratada,
		itens: itensReidratados,
	};
}

export function extrairTributosCabecalhoXml(
	dadosXml: NFeXmlParsed,
): Pick<NotaFiscal, CampoTributoCabecalho> {
	return {
		baseicms: dadosXml.baseicms ?? null,
		icms: dadosXml.icms ?? null,
		ipi: dadosXml.ipi ?? null,
		pis: dadosXml.pis ?? null,
		cofins: dadosXml.cofins ?? null,
	};
}

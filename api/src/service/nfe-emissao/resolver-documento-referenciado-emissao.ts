import type { HttpResponse } from "@/model/http-model.js";
import { buscarNotaFiscalXmlPorNota } from "@/repositories/nota-fiscal-xml-repositories.js";
import {
	buscarNotaFiscalPorId,
	listarItensPorNotaFiscal,
} from "@/repositories/nota-fiscal-repositories.js";
import { buscarCfopSaidaPorEntrada } from "@/repositories/cfop-depara-repositories.js";
import { buscarCfopPorCodigo } from "@/repositories/cfop-repositories.js";
import {
	inferirCodigoCfopDevolucaoEntrada,
	inferirCodigoCfopDevolucaoSaida,
	type TipoDevolucaoNfe,
} from "@/util/cfop-devolucao-emissao-nfe.js";
import { parseNFeXml } from "@/util/nfe-xml-parser.js";
import { extrairTributacaoItemEmissaoNfe } from "@/util/dados-emissao-nfe-nota.js";
import { STATUS_RASCUNHO_IMPORTACAO } from "@/util/nota-fiscal-constants.js";
import { NFE_STATUS } from "@/util/nfe-status.js";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpOk,
} from "@/util/http-util.js";

export type DocumentoReferenciadoEmissao = {
	chave: string;
	modelo?: string;
	serie?: string;
	numero?: string;
	dataEmissao?: string;
	idnotafiscalReferenciada?: string;
	cnpjEmitente?: string;
	razaosocialEmitente?: string;
	tipoDevolucao?: TipoDevolucaoNfe;
};

export type ItemSugeridoDevolucao = {
	idproduto?: string;
	codigoProduto?: string;
	descricao: string;
	ncm: string;
	cfop: string;
	unidade: string;
	quantidade: number;
	valorUnitario: number;
	orig?: number;
	situacaotributaria?: string;
	cstpis?: string;
	cstcofins?: string;
	valorIpi?: number;
	valorIpiDevol?: number;
	baseIcms?: number;
	aliquotaIcms?: number;
	valorIcms?: number;
	baseIcmsSt?: number;
	valorIcmsSt?: number;
	valorFcpSt?: number;
	valorFcpStRet?: number;
	valorIcmsDesonerado?: number;
	valorIcmsMonoRet?: number;
	valorIcmsMonoReten?: number;
};

function mapearTributacaoItemReferencia(item: {
	ipi?: string | null;
	baseicms?: string | null;
	percentualicms?: string | null;
	icms?: string | null;
	dadosimportacao?: { tributacao?: Record<string, string | undefined> } | null;
}): Pick<
	ItemSugeridoDevolucao,
	| "valorIpi"
	| "valorIpiDevol"
	| "baseIcms"
	| "aliquotaIcms"
	| "valorIcms"
	| "baseIcmsSt"
	| "valorIcmsSt"
	| "valorFcpSt"
	| "valorFcpStRet"
> {
	const tributacao = item.dadosimportacao?.tributacao;
	const paraNumero = (valor?: string | null) => {
		if (valor == null || valor === "") return undefined;
		const numero = Number(valor);
		return Number.isFinite(numero) ? numero : undefined;
	};

	const valorIpi = paraNumero(item.ipi ?? tributacao?.ipi);

	return {
		...(valorIpi !== undefined ? { valorIpi } : {}),
		baseIcms: paraNumero(item.baseicms ?? tributacao?.baseicms),
		aliquotaIcms: paraNumero(item.percentualicms ?? tributacao?.percentualicms),
		valorIcms: paraNumero(item.icms ?? tributacao?.icms),
		baseIcmsSt: paraNumero(tributacao?.baseicmsst),
		valorIcmsSt: paraNumero(tributacao?.icmsst),
		valorFcpSt: paraNumero(tributacao?.fcpst),
	};
}

function mapearTributacaoItemReferenciaDevolucaoCompra(
	item: Parameters<typeof mapearTributacaoItemReferencia>[0],
): Pick<ItemSugeridoDevolucao, "valorIpiDevol" | "baseIcms" | "aliquotaIcms" | "valorIcms" | "baseIcmsSt" | "valorIcmsSt" | "valorFcpSt"> {
	const base = mapearTributacaoItemReferencia(item);
	const { valorIpi, ...resto } = base;
	const tributacaoEmissao = extrairTributacaoItemEmissaoNfe(item.dadosimportacao);
	const paraNumero = (valor?: string | null) => {
		if (valor == null || valor === "") return undefined;
		const numero = Number(valor);
		return Number.isFinite(numero) ? numero : undefined;
	};

	const valorIpiDevol =
		paraNumero(tributacaoEmissao?.valorIpiDevol) ?? valorIpi;

	return {
		...resto,
		...(valorIpiDevol !== undefined ? { valorIpiDevol } : {}),
	};
}

export type ResolverDocumentoReferenciadoResposta = DocumentoReferenciadoEmissao & {
	iddestinatarioSugerido?: string;
	itensSugeridos?: ItemSugeridoDevolucao[];
};

function sanitizarChaveNfe(chave?: string | null): string | null {
	const digitos = chave?.replace(/\D/g, "") ?? "";
	return digitos.length === 44 ? digitos : null;
}

async function resolverCfopDevolucaoCompraItem(
	idempresa: string,
	cfopEntrada?: string | null,
	idcfopEntrada?: string | null,
	uf?: string | null,
): Promise<string | undefined> {
	if (idcfopEntrada) {
		const dePara = await buscarCfopSaidaPorEntrada(idempresa, idcfopEntrada, uf ?? undefined);
		if (dePara?.codigosaida) {
			return dePara.codigosaida.replace(/\D/g, "");
		}
	}

	const inferido = cfopEntrada ? inferirCodigoCfopDevolucaoSaida(cfopEntrada) : null;
	if (!inferido) return undefined;

	const cfop = await buscarCfopPorCodigo(idempresa, inferido);
	return cfop?.codigo?.replace(/\D/g, "") ?? inferido;
}

async function resolverCfopDevolucaoVendaItem(
	idempresa: string,
	cfopSaida?: string | null,
): Promise<string | undefined> {
	const inferido = cfopSaida ? inferirCodigoCfopDevolucaoEntrada(cfopSaida) : null;
	if (!inferido) return undefined;

	const cfop = await buscarCfopPorCodigo(idempresa, inferido);
	return cfop?.codigo?.replace(/\D/g, "") ?? inferido;
}

async function montarItensSugeridosDevolucaoCompra(
	idempresa: string,
	idnotafiscal: string,
): Promise<ItemSugeridoDevolucao[]> {
	const itens = await listarItensPorNotaFiscal(idnotafiscal);
	const nota = await buscarNotaFiscalPorId(idnotafiscal);

	return Promise.all(
		itens.map(async (item) => {
			const cfopDevolucao =
				(await resolverCfopDevolucaoCompraItem(
					idempresa,
					item.cfop,
					item.idcfop ?? undefined,
					nota?.estado ?? undefined,
				)) ?? item.cfop?.replace(/\D/g, "") ?? "5202";

			return {
				idproduto: item.idproduto ?? undefined,
				descricao: item.descricao ?? "Item",
				ncm: item.ncm?.replace(/\D/g, "") ?? "00000000",
				cfop: cfopDevolucao,
				unidade: item.unidade ?? "UN",
				quantidade: Number(item.quantidade ?? 0),
				valorUnitario: Number(item.precounitario ?? 0),
				orig: item.origem ?? 0,
				situacaotributaria: item.situacaotributaria ?? undefined,
				cstpis: item.cstpis ?? undefined,
				cstcofins: item.cstcofins ?? undefined,
				...mapearTributacaoItemReferenciaDevolucaoCompra(
					item as Parameters<typeof mapearTributacaoItemReferenciaDevolucaoCompra>[0],
				),
			};
		}),
	);
}

async function montarItensSugeridosDevolucaoVenda(
	idempresa: string,
	idnotafiscal: string,
): Promise<ItemSugeridoDevolucao[]> {
	const itens = await listarItensPorNotaFiscal(idnotafiscal);

	return Promise.all(
		itens.map(async (item) => {
			const cfopDevolucao =
				(await resolverCfopDevolucaoVendaItem(idempresa, item.cfop)) ??
				item.cfop?.replace(/\D/g, "") ??
				"1202";

			return {
				idproduto: item.idproduto ?? undefined,
				descricao: item.descricao ?? "Item",
				ncm: item.ncm?.replace(/\D/g, "") ?? "00000000",
				cfop: cfopDevolucao,
				unidade: item.unidade ?? "UN",
				quantidade: Number(item.quantidade ?? 0),
				valorUnitario: Number(item.precounitario ?? 0),
				orig: item.origem ?? 0,
				situacaotributaria: item.situacaotributaria ?? undefined,
				cstpis: item.cstpis ?? undefined,
				cstcofins: item.cstcofins ?? undefined,
				...mapearTributacaoItemReferencia(
					item as Parameters<typeof mapearTributacaoItemReferencia>[0],
				),
			};
		}),
	);
}

export async function resolverDocumentoReferenciadoEmissao(
	idempresa: string,
	input: {
		tipoDevolucao?: TipoDevolucaoNfe;
		idnotafiscalReferenciada?: string;
		chaveNfe?: string;
		xml?: string;
	},
): Promise<HttpResponse<ResolverDocumentoReferenciadoResposta>> {
	const tipoDevolucao = input.tipoDevolucao ?? "compra";

	if (input.idnotafiscalReferenciada) {
		const nota = await buscarNotaFiscalPorId(input.idnotafiscalReferenciada);

		if (!nota) {
			return httpNaoEncontrado();
		}

		if (nota.idempresa !== idempresa) {
			return httpBadRequest("Nota de referência pertence a outra empresa");
		}

		if (tipoDevolucao === "compra" && nota.tipoorigem !== 0) {
			return httpBadRequest(
				"Devolução de compra exige referência a uma nota de entrada (compra)",
			);
		}

		if (tipoDevolucao === "venda" && nota.tipoorigem !== 1) {
			return httpBadRequest(
				"Devolução de venda exige referência a uma NF-e de venda emitida",
			);
		}

		if (nota.status === STATUS_RASCUNHO_IMPORTACAO) {
			return httpBadRequest("Finalize a nota de referência antes de utilizá-la");
		}

		if (tipoDevolucao === "venda" && nota.status !== NFE_STATUS.AUTORIZADA) {
			return httpBadRequest(
				"Somente NF-e de venda autorizadas podem ser referenciadas na devolução",
			);
		}

		let chave = sanitizarChaveNfe(nota.chavenfe);
		if (!chave) {
			const xmlArquivo = await buscarNotaFiscalXmlPorNota(nota.id);
			chave = sanitizarChaveNfe(xmlArquivo?.chavenfe);
		}

		if (!chave) {
			return httpBadRequest(
				"Nota referenciada sem chave NF-e. Informe a chave ou importe o XML.",
			);
		}

		const itensSugeridos =
			tipoDevolucao === "venda"
				? await montarItensSugeridosDevolucaoVenda(idempresa, nota.id)
				: await montarItensSugeridosDevolucaoCompra(idempresa, nota.id);

		return httpOk({
			chave,
			modelo: nota.modelo ?? "55",
			serie: nota.serie ?? undefined,
			numero: nota.numeronotafiscal ?? nota.numero ?? undefined,
			dataEmissao: nota.emissao ?? undefined,
			idnotafiscalReferenciada: nota.id,
			cnpjEmitente: nota.cnpjcpf ?? nota.cnpjemissor ?? undefined,
			razaosocialEmitente: nota.razaosocial ?? undefined,
			iddestinatarioSugerido: nota.identidade ?? undefined,
			tipoDevolucao,
			itensSugeridos,
		});
	}

	if (input.xml?.trim()) {
		try {
			const parsed = parseNFeXml(input.xml);
			const chave =
				sanitizarChaveNfe(parsed.chavenfe) ??
				sanitizarChaveNfe((input.xml.match(/Id="NFe(\d{44})"/i) ?? [])[1]);

			if (!chave) {
				return httpBadRequest("XML sem chave NF-e válida (44 dígitos)");
			}

			return httpOk({
				chave,
				modelo: parsed.modelo ?? "55",
				serie: parsed.serie ?? undefined,
				numero: parsed.numeronotafiscal ?? parsed.numero ?? undefined,
				dataEmissao: parsed.emissao ?? undefined,
				cnpjEmitente: parsed.cnpjemissor ?? undefined,
				razaosocialEmitente: parsed.razaosocial ?? undefined,
				tipoDevolucao,
			});
		} catch (erro) {
			return httpBadRequest(
				erro instanceof Error ? erro.message : "XML de referência inválido",
			);
		}
	}

	const chave = sanitizarChaveNfe(input.chaveNfe);
	if (!chave) {
		return httpBadRequest(
			"Informe a nota referenciada, a chave NF-e (44 dígitos) ou o XML",
		);
	}

	return httpOk({ chave, tipoDevolucao });
}

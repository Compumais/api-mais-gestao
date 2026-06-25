import type { ItemPayloadNfe } from "@/service/nfe-emissao/contexto-emissao-nfe.js";
import type { TipoDevolucaoNfe } from "@/util/cfop-devolucao-emissao-nfe.js";

export type DadosTributacaoItemEmissaoNfe = {
	valorIpi?: string;
	valorIpiDevol?: string;
	baseIcmsSt?: string;
	valorIcmsSt?: string;
	valorFcpSt?: string;
	valorFcpStRet?: string;
	valorIcmsDesonerado?: string;
	valorIcmsMonoRet?: string;
	valorIcmsMonoReten?: string;
};

export type DadosImportacaoItemEmissaoNfe = {
	emissao?: DadosTributacaoItemEmissaoNfe;
};

function paraStringOpcional(valor?: number | null): string | undefined {
	if (valor == null || !Number.isFinite(valor)) return undefined;
	return String(valor);
}

export function montarDadosImportacaoItemEmissaoNfe(
	item: ItemPayloadNfe,
): DadosImportacaoItemEmissaoNfe | undefined {
	const emissao: DadosTributacaoItemEmissaoNfe = {
		valorIpi: paraStringOpcional(item.valorIpi),
		valorIpiDevol: paraStringOpcional(item.valorIpiDevol),
		baseIcmsSt: paraStringOpcional(item.baseIcmsSt),
		valorIcmsSt: paraStringOpcional(item.valorIcmsSt),
		valorFcpSt: paraStringOpcional(item.valorFcpSt),
		valorFcpStRet: paraStringOpcional(item.valorFcpStRet),
		valorIcmsDesonerado: paraStringOpcional(item.valorIcmsDesonerado),
		valorIcmsMonoRet: paraStringOpcional(item.valorIcmsMonoRet),
		valorIcmsMonoReten: paraStringOpcional(item.valorIcmsMonoReten),
	};

	const possuiDados = Object.values(emissao).some(
		(valor) => valor != null && valor !== "",
	);

	return possuiDados ? { emissao } : undefined;
}

export function extrairTributacaoItemEmissaoNfe(
	dadosimportacao: unknown,
): DadosTributacaoItemEmissaoNfe | undefined {
	if (!dadosimportacao || typeof dadosimportacao !== "object") {
		return undefined;
	}

	const emissao = (dadosimportacao as DadosImportacaoItemEmissaoNfe).emissao;
	if (!emissao || typeof emissao !== "object") {
		return undefined;
	}

	return emissao;
}

export type DadosEmissaoNfeSalvos = {
	natOp?: string;
	formaPagamento?: string;
	idserienfe?: string;
	iddav?: string;
	formasPagamento?: Array<{
		idtipodocumentofinanceiro: string;
		valor: number;
		indPag?: number;
	}>;
	gerarFinanceiro?: boolean;
	gerarEstoque?: boolean;
	integracao?: {
		financeiroGeradoEm?: string;
		estoqueGeradoEm?: string;
		parcelasGeradas?: number;
		lancamentosCaixa?: number;
		movimentosGerados?: number;
		avisos?: string[];
	};
	transporte?: {
		modFrete?: number;
	};
	totais?: {
		frete?: number;
		seguro?: number;
		desconto?: number;
		outrasDespesas?: number;
	};
	documentoReferenciado?: {
		tipoDevolucao?: TipoDevolucaoNfe;
		idnotafiscalReferenciada?: string;
		chaveNfe?: string;
	};
};

export type DadosImportacaoEmissaoNfe = {
	emissao?: DadosEmissaoNfeSalvos;
};

export function montarSnapshotEmissaoNfe(params: {
	natOp?: string;
	idserienfe?: string;
	iddav?: string;
	formasPagamento?: Array<{
		idtipodocumentofinanceiro: string;
		valor: number;
		indPag?: number;
	}>;
	gerarFinanceiro?: boolean;
	gerarEstoque?: boolean;
	pagamento?: { formas?: Array<{ tPag?: string }> };
	transporte?: { modFrete?: number };
	totais?: {
		frete?: number;
		seguro?: number;
		desconto?: number;
		outrasDespesas?: number;
	};
	documentoReferenciado?: {
		tipoDevolucao?: TipoDevolucaoNfe;
		idnotafiscalReferenciada?: string;
		chave?: string;
		chaveNfe?: string;
	};
}): DadosImportacaoEmissaoNfe {
	const chaveRef =
		params.documentoReferenciado?.chave ??
		params.documentoReferenciado?.chaveNfe;

	return {
		emissao: {
			natOp: params.natOp?.trim() || undefined,
			idserienfe: params.idserienfe,
			iddav: params.iddav,
			formasPagamento: params.formasPagamento,
			gerarFinanceiro: params.gerarFinanceiro,
			gerarEstoque: params.gerarEstoque,
			formaPagamento: params.pagamento?.formas?.[0]?.tPag ?? "01",
			transporte: {
				modFrete: params.transporte?.modFrete ?? 9,
			},
			totais: {
				frete: params.totais?.frete ?? 0,
				seguro: params.totais?.seguro ?? 0,
				desconto: params.totais?.desconto ?? 0,
				outrasDespesas: params.totais?.outrasDespesas ?? 0,
			},
			documentoReferenciado: chaveRef
				? {
						tipoDevolucao: params.documentoReferenciado?.tipoDevolucao,
						idnotafiscalReferenciada:
							params.documentoReferenciado?.idnotafiscalReferenciada,
						chaveNfe: chaveRef,
					}
				: params.documentoReferenciado?.idnotafiscalReferenciada
					? {
							tipoDevolucao: params.documentoReferenciado?.tipoDevolucao,
							idnotafiscalReferenciada:
								params.documentoReferenciado.idnotafiscalReferenciada,
						}
					: undefined,
		},
	};
}

export function extrairDadosEmissaoNfeSalvos(
	dadosimportacao: unknown,
): DadosEmissaoNfeSalvos | undefined {
	if (!dadosimportacao || typeof dadosimportacao !== "object") {
		return undefined;
	}

	const emissao = (dadosimportacao as DadosImportacaoEmissaoNfe).emissao;
	if (!emissao || typeof emissao !== "object") {
		return undefined;
	}

	return emissao;
}

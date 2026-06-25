import type { DocumentoReferenciadoNfe, EmissaoNfeFormData } from "@/schemas/nfe-emissao.schema";

type NotaReemissao = {
	idserie?: string | null;
	frete?: string | null;
	seguro?: string | null;
	descontosubtotal?: string | null;
	outrasdespesas?: string | null;
	tipofrete?: number | null;
	chavedocumentoreferenciado?: string | null;
	seriedocumentoreferenciado?: string | null;
	numerodocumentoreferenciado?: string | null;
	datadocumentoreferenciado?: string | null;
	observacao?: string | null;
	dadosimportacao?: unknown;
	idtipodocumento?: string | null;
	idcondicaopagto?: string | null;
	idplanocontas?: string | null;
	idlocalestoque?: string | null;
};

type DadosEmissaoSalvos = {
	natOp?: string;
	formaPagamento?: string;
	idserienfe?: string;
	gerarFinanceiro?: boolean;
	gerarEstoque?: boolean;
	transporte?: { modFrete?: number };
	totais?: {
		frete?: number;
		seguro?: number;
		desconto?: number;
		outrasDespesas?: number;
	};
	documentoReferenciado?: DocumentoReferenciadoNfe & {
		chaveNfe?: string;
	};
};

function paraNumero(valor?: string | number | null): number {
	if (valor == null || valor === "") return 0;
	const numero = typeof valor === "number" ? valor : Number(valor);
	return Number.isFinite(numero) ? numero : 0;
}

function extrairEmissaoSalva(dadosimportacao: unknown): DadosEmissaoSalvos | undefined {
	if (!dadosimportacao || typeof dadosimportacao !== "object") return undefined;
	const emissao = (dadosimportacao as { emissao?: DadosEmissaoSalvos }).emissao;
	return emissao && typeof emissao === "object" ? emissao : undefined;
}

export function resolverContextoReemissaoNfe(notaFiscal: NotaReemissao): {
	natOp?: string;
	formaPagamento: string;
	idserienfe?: string;
	idtipodocumento?: string;
	idcondicaopagto?: string;
	idplanocontas?: string;
	idlocalestoque?: string;
	gerarFinanceiro: boolean;
	gerarEstoque: boolean;
	totais: NonNullable<EmissaoNfeFormData["totais"]>;
	transporte: NonNullable<EmissaoNfeFormData["transporte"]>;
	documentoReferenciado?: DocumentoReferenciadoNfe;
	informacoesAdicionais?: string;
} {
	const emissao = extrairEmissaoSalva(notaFiscal.dadosimportacao);

	const totais = {
		frete: paraNumero(notaFiscal.frete ?? emissao?.totais?.frete),
		seguro: paraNumero(notaFiscal.seguro ?? emissao?.totais?.seguro),
		desconto: paraNumero(
			notaFiscal.descontosubtotal ?? emissao?.totais?.desconto,
		),
		outrasDespesas: paraNumero(
			notaFiscal.outrasdespesas ?? emissao?.totais?.outrasDespesas,
		),
	};

	const transporte = {
		modFrete:
			notaFiscal.tipofrete ??
			emissao?.transporte?.modFrete ??
			9,
	};

	const documentoSalvo = emissao?.documentoReferenciado;
	const chavePersistida = notaFiscal.chavedocumentoreferenciado?.trim();
	let documentoReferenciado: DocumentoReferenciadoNfe | undefined;

	if (documentoSalvo?.idnotafiscalReferenciada || documentoSalvo?.chaveNfe) {
		documentoReferenciado = {
			tipoDevolucao: documentoSalvo.tipoDevolucao,
			idnotafiscalReferenciada: documentoSalvo.idnotafiscalReferenciada,
			chaveNfe: documentoSalvo.chaveNfe,
		};
	} else if (chavePersistida) {
		documentoReferenciado = { chaveNfe: chavePersistida };
	}

	return {
		natOp: emissao?.natOp,
		formaPagamento: emissao?.formaPagamento ?? "01",
		idserienfe: notaFiscal.idserie ?? emissao?.idserienfe ?? undefined,
		idtipodocumento: notaFiscal.idtipodocumento ?? undefined,
		idcondicaopagto: notaFiscal.idcondicaopagto ?? undefined,
		idplanocontas: notaFiscal.idplanocontas ?? undefined,
		idlocalestoque: notaFiscal.idlocalestoque ?? undefined,
		gerarFinanceiro: emissao?.gerarFinanceiro ?? true,
		gerarEstoque: emissao?.gerarEstoque ?? true,
		totais,
		transporte,
		documentoReferenciado,
		informacoesAdicionais: notaFiscal.observacao ?? undefined,
	};
}

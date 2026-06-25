import { api } from "@/lib/axios";
import type { EmissaoNfeFormData } from "@/schemas/nfe-emissao.schema";

export interface ResultadoIntegracaoNfeVenda {
	parcelasGeradas: number;
	lancamentosCaixa: number;
	movimentosGerados: number;
	avisos: string[];
}

export interface ResultadoEmissaoNfe {
	idnotafiscal: string;
	chave?: string;
	protocolo?: string;
	cStat?: string;
	xMotivo?: string;
	ambiente?: number;
	pendencias?: Array<{ codigo: string; mensagem: string }>;
	integracao?: ResultadoIntegracaoNfeVenda;
}

export interface NotaFiscalEmitida {
	id: string;
	idempresa: string;
	idserie?: string | null;
	identidade?: string | null;
	observacao?: string | null;
	numeronotafiscal?: string | null;
	serie?: string | null;
	modelo?: string | null;
	chavenfe?: string | null;
	protocolonfe?: string | null;
	status?: number | null;
	tipoambientenfe?: number | null;
	tipoorigem?: number | null;
	razaosocial?: string | null;
	cnpjcpf?: string | null;
	inscricaoestadual?: string | null;
	endereco?: string | null;
	numeroendereco?: string | null;
	bairro?: string | null;
	cep?: string | null;
	cidade?: string | null;
	estado?: string | null;
	valortotalnota?: string | null;
	frete?: string | null;
	seguro?: string | null;
	outrasdespesas?: string | null;
	descontosubtotal?: string | null;
	tipofrete?: number | null;
	dadosimportacao?: unknown;
	emissao?: string | null;
	datainclusao?: string | null;
	datahoraemissao?: string | null;
	cancelamento?: string | null;
	justificativacancelamentonfe?: string | null;
	mensagemtransmissaonfe?: string | null;
	codigostatusprotocolonfe?: number | null;
	codigostatustransmissaonfe?: number | null;
	chavedocumentoreferenciado?: string | null;
	finalidadeemissaonfe?: number | null;
	tipoDevolucao?: "compra" | "venda";
	idtipodocumento?: string | null;
	idcondicaopagto?: string | null;
	idplanocontas?: string | null;
	idlocalestoque?: string | null;
}

export interface ItemSugeridoDevolucao {
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
}

export interface DocumentoReferenciadoResolvido {
	chave: string;
	modelo?: string;
	serie?: string;
	numero?: string;
	dataEmissao?: string;
	idnotafiscalReferenciada?: string;
	cnpjEmitente?: string;
	razaosocialEmitente?: string;
	tipoDevolucao?: "compra" | "venda";
	iddestinatarioSugerido?: string;
	itensSugeridos?: ItemSugeridoDevolucao[];
}

export interface ListarNfesResponse {
	data: NotaFiscalEmitida[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export async function resolverReferenciaEmissao(params: {
	idempresa: string;
	tipoDevolucao?: "compra" | "venda";
	idnotafiscalReferenciada?: string;
	chaveNfe?: string;
	xml?: string;
}): Promise<DocumentoReferenciadoResolvido> {
	const { data } = await api.post<DocumentoReferenciadoResolvido>(
		"/nfe/emissao/resolver-referencia",
		params,
	);
	return data;
}

export async function emitirNfe(
	dados: EmissaoNfeFormData,
): Promise<ResultadoEmissaoNfe> {
	const { data } = await api.post<ResultadoEmissaoNfe>("/nfe/emissao", dados);
	return data;
}

export async function transmitirNfe(
	id: string,
	confirmarProducao = false,
): Promise<ResultadoEmissaoNfe> {
	const { data } = await api.post<ResultadoEmissaoNfe>(
		`/nfe/emissao/${id}/transmitir`,
		{ confirmarProducao },
	);
	return data;
}

export interface ResultadoEventoNfe {
	idnotafiscal: string;
	status: number;
	cStat?: string;
	xMotivo?: string;
	protocolo?: string;
}

export async function cancelarNfe(
	id: string,
	justificativa: string,
): Promise<ResultadoEventoNfe> {
	const { data } = await api.post<ResultadoEventoNfe>(
		`/nfe/emissao/${id}/cancelar`,
		{ justificativa },
	);
	return data;
}

export async function inutilizarNfe(
	id: string,
	justificativa: string,
): Promise<ResultadoEventoNfe> {
	const { data } = await api.post<ResultadoEventoNfe>(
		`/nfe/emissao/${id}/inutilizar`,
		{ justificativa },
	);
	return data;
}

export async function listarNfesEmitidas(params: {
	idempresa: string;
	status?: number;
	page?: number;
	limit?: number;
}): Promise<ListarNfesResponse> {
	const { data } = await api.get<ListarNfesResponse>("/nfe/emissao", {
		params,
	});
	return data;
}

export async function buscarNfeEmitidaPorId(
	id: string,
): Promise<NotaFiscalEmitida> {
	const { data } = await api.get<{ notaFiscal: NotaFiscalEmitida }>(
		`/notas-fiscais/${id}`,
	);
	return data.notaFiscal;
}

export async function buscarNfeEmitidaComItens(id: string): Promise<{
	notaFiscal: NotaFiscalEmitida;
	itens: Array<Record<string, unknown>>;
}> {
	const { data } = await api.get<{
		notaFiscal: NotaFiscalEmitida;
		itens: Array<Record<string, unknown>>;
	}>(`/notas-fiscais/${id}`);
	return data;
}

export async function downloadXmlNfe(
	id: string,
	tipo: "assinado" | "autorizado" = "autorizado",
): Promise<Blob> {
	const { data } = await api.get<Blob>(`/notas-fiscais/${id}/xml`, {
		params: { tipo },
		responseType: "blob",
	});
	return data;
}

export async function downloadDanfeNfe(id: string): Promise<Blob> {
	const { data } = await api.get<Blob>(`/notas-fiscais/${id}/danfe`, {
		responseType: "blob",
	});
	return data;
}

export async function abrirDanfeNfe(id: string): Promise<void> {
	const blob = await downloadDanfeNfe(id);

	if (blob.type && !blob.type.includes("pdf")) {
		const texto = await blob.text();
		let mensagem = "Erro ao gerar DANFE";
		try {
			const erro = JSON.parse(texto) as { error?: string; message?: string };
			mensagem = erro.error ?? erro.message ?? mensagem;
		} catch {
			if (texto) mensagem = texto;
		}
		throw new Error(mensagem);
	}

	const url = URL.createObjectURL(blob);
	const novaAba = window.open(url, "_blank", "noopener,noreferrer");

	if (!novaAba) {
		URL.revokeObjectURL(url);
		throw new Error(
			"Não foi possível abrir o DANFE. Verifique se o navegador bloqueou pop-ups.",
		);
	}

	window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
}

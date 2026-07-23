import { api } from "@/lib/axios";
import type { EmissaoNfseFormData } from "@/schemas/nfse-emissao.schema";

export interface ResultadoEmissaoNfse {
	idnotafiscal: string;
	numeroRps: number;
	serie: string;
	numeroNfse?: string | null;
	codigoVerificacao?: string | null;
	link?: string | null;
	protocolo?: string | null;
	ambiente?: number;
	erros?: Array<{ codigo: string; mensagem: string }>;
	integracao?: {
		parcelasGeradas: number;
		lancamentosCaixa: number;
		avisos: string[];
	};
}

export interface DadosEmissaoNfseSalvos {
	protocolo?: string | null;
	protocoloCancelamento?: string | null;
	protocoloSubstituicao?: string | null;
	modo?: "dps" | "rps" | "rps-gerar";
	gerarFinanceiro?: boolean;
	payload?: {
		prestador?: Record<string, unknown>;
		tomador?: Record<string, unknown>;
		rps?: {
			numero?: number;
			serie?: string;
			dataEmissao?: string;
			competencia?: string;
		};
		servico?: {
			itemListaServico?: string;
			discriminacao?: string;
			codigoCnae?: string;
			codigoTributacaoMunicipio?: string;
			codigoTributacaoNacional?: string;
			codigoNbs?: string;
			exigibilidadeIss?: string;
			issRetido?: string;
			valores?: {
				servicos?: number;
				iss?: number;
				aliquota?: number;
				pis?: number;
				cofins?: number;
				inss?: number;
				ir?: number;
				csll?: number;
			};
			ibsCbs?: { cIndOp?: string };
		};
		itens?: Array<{
			descricao?: string;
			quantidade?: number;
			valorUnitario?: number;
			codigoListaLc11603?: string;
		}>;
	};
}

export interface NotaFiscalServico {
	id: string;
	idempresa: string;
	identidade?: string | null;
	numeronotafiscal?: string | null;
	numeronfse?: string | null;
	serie?: string | null;
	modelo?: string | null;
	status?: number | null;
	tipoambientenfe?: number | null;
	razaosocial?: string | null;
	cnpjcpf?: string | null;
	valortotalnota?: string | null;
	linknfse?: string | null;
	codigoautenticidadenfse?: string | null;
	emissao?: string | null;
	datahoraemissao?: string | null;
	mensagemtransmissaonfe?: string | null;
	cancelamento?: string | null;
	dadosimportacao?: DadosEmissaoNfseSalvos | null;
}

export interface NotaFiscalServicoDetalhe {
	notaFiscal: NotaFiscalServico;
	itens: Array<{
		id: string;
		descricao: string;
		quantidade: string;
		precounitario: string;
		total: string;
		codigolistalc11603?: string | null;
	}>;
}

export interface ResultadoConsultaNfse {
	idnotafiscal: string;
	numeroNfse?: string | null;
	codigoVerificacao?: string | null;
	link?: string | null;
	status?: number;
	protocolo?: string | null;
	pendente?: boolean;
	modo?: string;
}

export async function emitirNfse(
	idempresa: string,
	dados: EmissaoNfseFormData & { iddestinatario?: string },
): Promise<ResultadoEmissaoNfse> {
	const { data } = await api.post<ResultadoEmissaoNfse>("/nfse/emissao", {
		idempresa,
		iddestinatario: dados.iddestinatario,
		idnfseserie: dados.idnfseserie,
		confirmarProducao: dados.confirmarProducao,
		competencia: dados.competencia,
		dataEmissao: dados.dataEmissao,
		gerarFinanceiro: dados.gerarFinanceiro,
		idplanocontas: dados.idplanocontas,
		idcondicaopagto: dados.idcondicaopagto,
		idtipodocumento: dados.idtipodocumento,
		servico: {
			itemListaServico: dados.itemListaServico,
			discriminacao: dados.discriminacao,
			codigoCnae: dados.codigoCnae,
			codigoTributacaoMunicipio: dados.codigoTributacaoMunicipio,
			codigoTributacaoNacional: dados.codigoTributacaoNacional || undefined,
			codigoNbs: dados.codigoNbs || undefined,
			exigibilidadeIss: dados.exigibilidadeIss,
			issRetido: dados.issRetido,
			valores: dados.valores,
			ibsCbs: dados.codigoIndicadorOperacao
				? { cIndOp: dados.codigoIndicadorOperacao }
				: undefined,
		},
	});
	return data;
}

export async function listarNfsesEmitidas(params: {
	idempresa: string;
	status?: number;
	page?: number;
	limit?: number;
}) {
	const { data } = await api.get<{
		data: NotaFiscalServico[];
		paginacao: { page: number; limit: number; total: number; totalPages: number };
	}>("/nfse/emissao", { params });
	return data;
}

export async function buscarNfsePorId(id: string) {
	const { data } = await api.get<NotaFiscalServicoDetalhe>(`/nfse/emissao/${id}`);
	return data;
}

export async function cancelarNfse(id: string, motivo: string) {
	const { data } = await api.post<{
		idnotafiscal: string;
		status: number;
		pendente?: boolean;
		protocolo?: string | null;
	}>(`/nfse/emissao/${id}/cancelar`, { motivo });
	return data;
}

export async function substituirNfse(
	id: string,
	dados: { idnotafiscalsubstituta: string; motivo: string },
) {
	const { data } = await api.post<{
		idnotafiscal: string;
		idnotafiscalsubstituta: string;
		status: number;
		pendente?: boolean;
		protocolo?: string | null;
	}>(`/nfse/emissao/${id}/substituir`, dados);
	return data;
}

export async function consultarNfsePorRps(id: string) {
	const { data } = await api.post<ResultadoConsultaNfse>(
		`/nfse/emissao/${id}/consultar`,
	);
	return data;
}

export async function retransmitirNfse(id: string) {
	const { data } = await api.post<ResultadoEmissaoNfse>(
		`/nfse/emissao/${id}/retransmitir`,
	);
	return data;
}

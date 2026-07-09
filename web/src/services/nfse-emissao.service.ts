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
			exigibilidadeIss: dados.exigibilidadeIss,
			issRetido: dados.issRetido,
			valores: dados.valores,
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
	const { data } = await api.post<{ idnotafiscal: string; status: number }>(
		`/nfse/emissao/${id}/cancelar`,
		{ motivo },
	);
	return data;
}

export async function consultarNfsePorRps(id: string) {
	const { data } = await api.post<{
		idnotafiscal: string;
		numeroNfse?: string | null;
		codigoVerificacao?: string | null;
		link?: string | null;
	}>(`/nfse/emissao/${id}/consultar`);
	return data;
}

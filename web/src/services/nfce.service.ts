import { api } from "@/lib/axios";
import type { Paginacao } from "@/services/conta-mesa.service";
import type { FecharContaFormData } from "@/schemas/fechar-conta.schema";
import type { CarrinhoLocalItem } from "@/lib/gourmet-utils";

export interface NfceListagem {
	idnotafiscal: string;
	idvenda: string | null;
	numeronotafiscal: string | null;
	serie: string | null;
	chavenfe: string | null;
	protocolonfe: string | null;
	status: number | null;
	valortotalnota: string | null;
	emissao: string | null;
	datahoraemissao: string | null;
	datainclusao: string | null;
	tipoambientenfe: number | null;
	mensagemtransmissaonfe: string | null;
	codigostatusprotocolonfe: number | null;
}

/** @deprecated use NfceListagem */
export type NfcePendente = NfceListagem;

export interface ResultadoReemissaoNfce {
	emitida: boolean;
	idnotafiscal?: string;
	chave?: string;
	protocolo?: string;
	qrCode?: string;
	urlChave?: string;
	cStat?: string;
	xMotivo?: string;
	erro?: string;
	pendencias?: Array<{ codigo: string; mensagem: string }>;
}

export interface DadosCupomNfceApi {
	vendaId?: string;
	empresaNome: string;
	dataHora: string;
	itens: Array<{
		codigo?: number | null;
		nome: string;
		quantidade: string;
		precounitario: string;
	}>;
	subtotal: number;
	desconto: number;
	taxaServico: number;
	couvert: number;
	total: number;
	pagamentos: Array<{
		meio: string;
		label: string;
		valor: number;
	}>;
	troco: number;
	nfce: {
		idnotafiscal: string;
		chave: string;
		protocolo?: string;
		ambiente?: number;
		qrCode?: string;
		urlChave?: string;
	};
}

export interface NfceParaEditar {
	nota: {
		idnotafiscal: string;
		numeronotafiscal: string | null;
		serie: string | null;
		chavenfe: string | null;
		status: number | null;
		mensagemtransmissaonfe: string | null;
		tipoambientenfe: number | null;
		valortotalnota: string | null;
	};
	venda: {
		id: string;
		valordinheiro: string | null;
		valorcartao: string | null;
		valorcartaocredito: string | null;
		valorcartaodebito: string | null;
		valorpix: string | null;
		valorprepago: string | null;
		valortroco: string | null;
		valortotal: string | null;
	};
	itens: Array<{
		idproduto: string;
		nomeproduto: string;
		codigo: number | null;
		quantidade: string;
		precounitario: string;
		unidademedida: string | null;
	}>;
}

export interface ResultadoAtualizacaoVendaNfce {
	idvenda: string;
	idnotafiscal: string;
	movimentosRegistrados: number;
	avisos: string[];
	emissaoNfce?: ResultadoReemissaoNfce;
}

export const nfceService = {
	async listar(params: {
		idempresa: string;
		status?: number;
		page?: number;
		limit?: number;
	}): Promise<{ data: NfceListagem[]; paginacao: Paginacao }> {
		const { data } = await api.get<{ data: NfceListagem[]; paginacao: Paginacao }>(
			"/nfce/pendentes",
			{ params },
		);
		return data;
	},

	async listarPendentes(params: {
		idempresa: string;
		page?: number;
		limit?: number;
	}): Promise<{ data: NfceListagem[]; paginacao: Paginacao }> {
		return nfceService.listar(params);
	},

	async buscarParaEditar(params: {
		idempresa: string;
		idnotafiscal: string;
	}): Promise<NfceParaEditar> {
		const { data } = await api.get<NfceParaEditar>(
			`/nfce/${params.idnotafiscal}/editar`,
			{ params: { idempresa: params.idempresa } },
		);
		return data;
	},

	async atualizarVenda(params: {
		idempresa: string;
		idnotafiscal: string;
		itens: CarrinhoLocalItem[];
		pagamento: FecharContaFormData;
	}): Promise<ResultadoAtualizacaoVendaNfce> {
		const { data } = await api.put<ResultadoAtualizacaoVendaNfce>(
			`/nfce/${params.idnotafiscal}/venda`,
			{
				idempresa: params.idempresa,
				itens: params.itens.map((item) => ({
					idproduto: item.idproduto,
					quantidade: item.quantidade,
					precounitario: item.precounitario,
					nomeproduto: item.nomeproduto,
				})),
				pagamentos: params.pagamento,
			},
		);
		return data;
	},

	async reemitir(params: {
		idempresa: string;
		idnotafiscal: string;
	}): Promise<ResultadoReemissaoNfce> {
		const { data } = await api.post<ResultadoReemissaoNfce>(
			`/nfce/${params.idnotafiscal}/reemitir`,
			{ idempresa: params.idempresa },
		);
		return data;
	},

	async buscarCupom(idnotafiscal: string): Promise<DadosCupomNfceApi> {
		const { data } = await api.get<DadosCupomNfceApi>(
			`/nfce/${idnotafiscal}/cupom`,
		);
		return data;
	},
};

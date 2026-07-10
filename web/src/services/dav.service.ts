import { api } from "@/lib/axios";
import type { ResultadoEmissaoNfe } from "@/services/nfe-emissao.service";

export interface PedidoDav {
	id: string;
	idempresa: string;
	codigo: number | null;
	data: string | null;
	datainclusao: string | null;
	nomecliente: string | null;
	cnpjcpfcliente: string | null;
	idcliente: string | null;
	idnotafiscal: string | null;
	idtipodocumentofinanceiro: string | null;
	idcondicaopagamento: string | null;
	idlocalestoque: string | null;
	valor: string | null;
	descontosubtotal: string | null;
	desconto: string | null;
	status: number | null;
	tipodocumento: number | null;
	observacao: string | null;
	datahorafaturamento: string | null;
}

export interface PedidoDavItem {
	id: string;
	iddav: string;
	idproduto: string | null;
	nomeproduto: string | null;
	codigoproduto: string | null;
	quantidade: string | null;
	preco: string | null;
	total: string | null;
	unidademedida: string | null;
	idcfop: string | null;
}

export interface ListarPedidosResponse {
	data: PedidoDav[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export interface ListarPedidosParams {
	idempresa: string;
	page?: number;
	limit?: number;
	dataInicio?: string;
	dataFim?: string;
	idcliente?: string;
	status?: number;
	faturado?: boolean;
	codigo?: number;
	busca?: string;
}

export interface CriarPedidoData {
	idempresa: string;
	codigo?: number;
	idcliente?: string;
	nomecliente?: string;
	cnpjcpfcliente?: string;
	idtipodocumentofinanceiro?: string;
	idcondicaopagamento?: string;
	idlocalestoque?: string;
	observacao?: string;
	status?: number;
	tipodocumento?: number;
	data?: string;
	datainclusao?: string;
	currenttimemillis?: number;
}

export interface AtualizarPedidoData extends Partial<CriarPedidoData> {
	descontosubtotal?: string;
	valor?: string;
}

export interface CriarPedidoItemData {
	idproduto: string;
	quantidade: string;
	preco: string;
	unidademedida?: string;
	idcfop?: string;
}

export interface AtualizarPedidoItemData {
	idproduto?: string;
	quantidade?: string;
	preco?: string;
	unidademedida?: string;
	idcfop?: string | null;
}

export interface FaturarPedidoNfeData {
	idempresa: string;
	idserienfe?: string;
	confirmarProducao?: boolean;
	gerarFinanceiro?: boolean;
	gerarEstoque?: boolean;
}

export interface ContextoEmissaoNfePedidoItem {
	idproduto?: string;
	codigoProduto?: string;
	descricao: string;
	ncm: string;
	cfop: string;
	unidade: string;
	quantidade: number;
	valorUnitario: number;
	cst?: string;
	csosn?: string;
	orig?: number;
}

export interface ContextoEmissaoNfePedido {
	iddav: string;
	pendencias: string[];
	iddestinatario?: string;
	idtipodocumento?: string;
	idcondicaopagto?: string;
	idlocalestoque?: string;
	formaPagamentoNfe?: string;
	informacoesAdicionais?: string;
	totais?: {
		desconto?: number;
	};
	itens: ContextoEmissaoNfePedidoItem[];
	gerarFinanceiro: boolean;
	gerarEstoque: boolean;
}

export interface ContextoEmissaoNfeLote {
	iddavs: string[];
	codigosPedidos: number[];
	pendencias: string[];
	iddestinatario?: string;
	idtipodocumento?: string;
	idcondicaopagto?: string;
	idlocalestoque?: string;
	formaPagamentoNfe?: string;
	informacoesAdicionais?: string;
	totais?: {
		desconto?: number;
	};
	itens: ContextoEmissaoNfePedidoItem[];
	gerarFinanceiro: boolean;
	gerarEstoque: boolean;
	avisos?: string[];
}

export const davService = {
	async listar(params: ListarPedidosParams): Promise<ListarPedidosResponse> {
		const { data } = await api.get<ListarPedidosResponse>("/davs", {
			params: {
				...params,
				faturado:
					params.faturado === undefined
						? undefined
						: params.faturado
							? "true"
							: "false",
			},
		});
		return data;
	},

	async buscar(id: string): Promise<PedidoDav> {
		const { data } = await api.get<PedidoDav>(`/davs/${id}`);
		return data;
	},

	async criar(dados: CriarPedidoData): Promise<PedidoDav> {
		const { data } = await api.post<PedidoDav>("/davs", dados);
		return data;
	},

	async atualizar(id: string, dados: AtualizarPedidoData): Promise<PedidoDav> {
		const { data } = await api.put<PedidoDav>(`/davs/${id}`, dados);
		return data;
	},

	async excluir(id: string): Promise<void> {
		await api.delete(`/davs/${id}`);
	},

	async cancelar(id: string, idempresa: string): Promise<PedidoDav> {
		const { data } = await api.post<PedidoDav>(`/davs/${id}/cancelar`, {
			idempresa,
		});
		return data;
	},

	async listarItens(iddav: string): Promise<PedidoDavItem[]> {
		const { data } = await api.get<PedidoDavItem[]>(`/davs/${iddav}/itens`);
		return data;
	},

	async criarItem(
		iddav: string,
		dados: CriarPedidoItemData,
	): Promise<PedidoDavItem> {
		const { data } = await api.post<PedidoDavItem>(
			`/davs/${iddav}/itens`,
			dados,
		);
		return data;
	},

	async atualizarItem(
		iddav: string,
		iditem: string,
		dados: AtualizarPedidoItemData,
	): Promise<PedidoDavItem> {
		const { data } = await api.put<PedidoDavItem>(
			`/davs/${iddav}/itens/${iditem}`,
			dados,
		);
		return data;
	},

	async excluirItem(iddav: string, iditem: string): Promise<void> {
		await api.delete(`/davs/${iddav}/itens/${iditem}`);
	},

	async faturarNfe(
		iddav: string,
		dados: FaturarPedidoNfeData,
	): Promise<ResultadoEmissaoNfe> {
		const { data } = await api.post<ResultadoEmissaoNfe>(
			`/davs/${iddav}/faturar-nfe`,
			dados,
		);
		return data;
	},

	async resolverContextoEmissaoNfe(
		iddav: string,
		idempresa: string,
	): Promise<ContextoEmissaoNfePedido> {
		const { data } = await api.get<ContextoEmissaoNfePedido>(
			`/davs/${iddav}/contexto-emissao-nfe`,
			{ params: { idempresa } },
		);
		return data;
	},

	async resolverContextoEmissaoNfeLote(
		iddavs: string[],
		idempresa: string,
	): Promise<ContextoEmissaoNfeLote> {
		const { data } = await api.get<ContextoEmissaoNfeLote>(
			"/davs/contexto-emissao-nfe-lote",
			{
				params: {
					idempresa,
					iddavs: iddavs.join(","),
				},
			},
		);
		return data;
	},
};

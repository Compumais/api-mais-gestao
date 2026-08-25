import { api } from "@/lib/axios";

export interface PedidoCompraItem {
	id: string;
	idpedidocompra: string;
	idproduto: string | null;
	descricao: string | null;
	quantidade: string;
	precounitario: string;
	total: string;
	idcotacaoitem: string | null;
	codigoproduto: number | null;
	nomeproduto: string | null;
	descricaoproduto: string | null;
}

export interface PedidoCompra {
	id: string;
	idempresa: string;
	codigo: number;
	idcotacao: string | null;
	idproposta: string | null;
	fornecedornome: string;
	fornecedortelefone: string;
	valortotal: string;
	status: string;
	observacao: string | null;
	currenttimemillis: number | null;
	cotacaotitulo?: string | null;
	cotacaocodigo?: number | null;
	itens?: PedidoCompraItem[];
}

export interface ListarPedidosCompraResponse {
	data: PedidoCompra[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export const pedidosCompraService = {
	async listar(params: {
		idempresa: string;
		status?: string;
		idcotacao?: string;
		page?: number;
		limit?: number;
	}): Promise<ListarPedidosCompraResponse> {
		const { data } = await api.get<ListarPedidosCompraResponse>(
			"/pedidos-compra",
			{ params },
		);
		return data;
	},

	async buscar(id: string): Promise<PedidoCompra> {
		const { data } = await api.get<PedidoCompra>(`/pedidos-compra/${id}`);
		return data;
	},

	async cancelar(id: string): Promise<PedidoCompra> {
		const { data } = await api.post<PedidoCompra>(
			`/pedidos-compra/${id}/cancelar`,
		);
		return data;
	},
};

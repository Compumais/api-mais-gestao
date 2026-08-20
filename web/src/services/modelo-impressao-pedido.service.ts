import { api } from "@/lib/axios";
import type {
	LayoutModeloImpressaoPedido,
	ModeloImpressaoPedidoFormData,
} from "@/schemas/modelo-impressao-pedido.schema";

export type ModeloImpressaoPedido = {
	id: string;
	idempresa: string;
	nome: string;
	descricao: string | null;
	layout: LayoutModeloImpressaoPedido;
	primario: boolean;
	sistema: boolean;
	ativo: boolean;
	datainclusao: string;
	atualizadoem: string;
};

export const modeloImpressaoPedidoService = {
	async listar(idempresa: string): Promise<ModeloImpressaoPedido[]> {
		const { data } = await api.get<ModeloImpressaoPedido[]>(
			`/empresas/${idempresa}/modelos-impressao-pedido`,
		);
		return data;
	},

	async buscar(
		idempresa: string,
		id: string,
	): Promise<ModeloImpressaoPedido> {
		const { data } = await api.get<ModeloImpressaoPedido>(
			`/empresas/${idempresa}/modelos-impressao-pedido/${id}`,
		);
		return data;
	},

	async criar(
		idempresa: string,
		payload: ModeloImpressaoPedidoFormData,
	): Promise<ModeloImpressaoPedido> {
		const { data } = await api.post<ModeloImpressaoPedido>(
			`/empresas/${idempresa}/modelos-impressao-pedido`,
			payload,
		);
		return data;
	},

	async atualizar(
		idempresa: string,
		id: string,
		payload: Partial<ModeloImpressaoPedidoFormData> & { ativo?: boolean },
	): Promise<ModeloImpressaoPedido> {
		const { data } = await api.put<ModeloImpressaoPedido>(
			`/empresas/${idempresa}/modelos-impressao-pedido/${id}`,
			payload,
		);
		return data;
	},

	async excluir(idempresa: string, id: string): Promise<void> {
		await api.delete(`/empresas/${idempresa}/modelos-impressao-pedido/${id}`);
	},

	async definirPrimario(
		idempresa: string,
		id: string,
	): Promise<ModeloImpressaoPedido> {
		const { data } = await api.post<ModeloImpressaoPedido>(
			`/empresas/${idempresa}/modelos-impressao-pedido/${id}/definir-primario`,
		);
		return data;
	},

	async duplicar(
		idempresa: string,
		id: string,
	): Promise<ModeloImpressaoPedido> {
		const { data } = await api.post<ModeloImpressaoPedido>(
			`/empresas/${idempresa}/modelos-impressao-pedido/${id}/duplicar`,
		);
		return data;
	},

	async seed(idempresa: string): Promise<ModeloImpressaoPedido[]> {
		const { data } = await api.post<ModeloImpressaoPedido[]>(
			`/empresas/${idempresa}/modelos-impressao-pedido/seed`,
		);
		return data;
	},
};

import { api } from "@/lib/axios";
import type {
	LayoutModeloImpressaoOs,
	ModeloImpressaoOsFormData,
} from "@/schemas/modelo-impressao-os.schema";

export type ModeloImpressaoOrdemServico = {
	id: string;
	idempresa: string;
	nome: string;
	descricao: string | null;
	layout: LayoutModeloImpressaoOs;
	primario: boolean;
	sistema: boolean;
	ativo: boolean;
	datainclusao: string;
	atualizadoem: string;
};

export const modeloImpressaoOsService = {
	async listar(idempresa: string): Promise<ModeloImpressaoOrdemServico[]> {
		const { data } = await api.get<ModeloImpressaoOrdemServico[]>(
			`/empresas/${idempresa}/modelos-impressao-os`,
		);
		return data;
	},

	async buscar(
		idempresa: string,
		id: string,
	): Promise<ModeloImpressaoOrdemServico> {
		const { data } = await api.get<ModeloImpressaoOrdemServico>(
			`/empresas/${idempresa}/modelos-impressao-os/${id}`,
		);
		return data;
	},

	async criar(
		idempresa: string,
		payload: ModeloImpressaoOsFormData,
	): Promise<ModeloImpressaoOrdemServico> {
		const { data } = await api.post<ModeloImpressaoOrdemServico>(
			`/empresas/${idempresa}/modelos-impressao-os`,
			payload,
		);
		return data;
	},

	async atualizar(
		idempresa: string,
		id: string,
		payload: Partial<ModeloImpressaoOsFormData> & { ativo?: boolean },
	): Promise<ModeloImpressaoOrdemServico> {
		const { data } = await api.put<ModeloImpressaoOrdemServico>(
			`/empresas/${idempresa}/modelos-impressao-os/${id}`,
			payload,
		);
		return data;
	},

	async excluir(idempresa: string, id: string): Promise<void> {
		await api.delete(`/empresas/${idempresa}/modelos-impressao-os/${id}`);
	},

	async definirPrimario(
		idempresa: string,
		id: string,
	): Promise<ModeloImpressaoOrdemServico> {
		const { data } = await api.post<ModeloImpressaoOrdemServico>(
			`/empresas/${idempresa}/modelos-impressao-os/${id}/definir-primario`,
		);
		return data;
	},

	async duplicar(
		idempresa: string,
		id: string,
	): Promise<ModeloImpressaoOrdemServico> {
		const { data } = await api.post<ModeloImpressaoOrdemServico>(
			`/empresas/${idempresa}/modelos-impressao-os/${id}/duplicar`,
		);
		return data;
	},

	async seed(idempresa: string): Promise<ModeloImpressaoOrdemServico[]> {
		const { data } = await api.post<ModeloImpressaoOrdemServico[]>(
			`/empresas/${idempresa}/modelos-impressao-os/seed`,
		);
		return data;
	},
};

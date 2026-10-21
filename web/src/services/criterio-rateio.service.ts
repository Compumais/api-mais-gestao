import { api } from "@/lib/axios";

export interface CriterioRateio {
	id: string;
	idempresa: string;
	nome: string;
	tipoparametro: string;
	ativo: number | null;
	observacao: string | null;
}

export interface CriterioRateioLinha {
	idcentrocusto: string;
	percentual?: number | null;
	peso?: number | null;
	ordem?: number;
}

export interface CriterioRateioCompleto extends CriterioRateio {
	linhas: CriterioRateioLinha[];
}

export interface SalvarCriterioRateioData {
	idempresa: string;
	nome: string;
	tipoparametro: string;
	ativo?: number;
	observacao?: string | null;
	linhas: CriterioRateioLinha[];
}

export const criterioRateioService = {
	async listar(params: {
		idempresa: string;
		ativo?: number;
	}): Promise<{ data: CriterioRateio[] }> {
		const { data } = await api.get<{ data: CriterioRateio[] }>(
			"/criterios-rateio",
			{ params },
		);
		return data;
	},

	async buscar(id: string): Promise<CriterioRateioCompleto> {
		const { data } = await api.get<CriterioRateioCompleto>(
			`/criterios-rateio/${id}`,
		);
		return data;
	},

	async criar(dados: SalvarCriterioRateioData): Promise<CriterioRateioCompleto> {
		const { data } = await api.post<CriterioRateioCompleto>(
			"/criterios-rateio",
			dados,
		);
		return data;
	},

	async atualizar(
		id: string,
		dados: SalvarCriterioRateioData,
	): Promise<CriterioRateioCompleto> {
		const { data } = await api.put<CriterioRateioCompleto>(
			`/criterios-rateio/${id}`,
			dados,
		);
		return data;
	},

	async deletar(id: string): Promise<void> {
		await api.delete(`/criterios-rateio/${id}`);
	},
};

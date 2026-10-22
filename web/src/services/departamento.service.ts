import { api } from "@/lib/axios";

export interface Departamento {
	id: string;
	idempresa: string;
	codigo: string;
	descricao: string;
	inativo: number | null;
}

export interface ListarDepartamentosResponse {
	data: Departamento[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export interface CriarDepartamentoData {
	idempresa: string;
	codigo: string;
	descricao: string;
	inativo?: number;
}

export const departamentoService = {
	async listar(params: {
		idempresa: string;
		page?: number;
		limit?: number;
		descricao?: string;
		inativo?: number;
	}): Promise<ListarDepartamentosResponse> {
		const { data } = await api.get<ListarDepartamentosResponse>("/departamentos", {
			params,
		});
		return data;
	},

	async criar(dados: CriarDepartamentoData): Promise<Departamento> {
		const { data } = await api.post<Departamento>("/departamentos", {
			...dados,
			inativo: dados.inativo ?? 0,
		});
		return data;
	},
};

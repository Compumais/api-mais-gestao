import { api } from "@/lib/axios";

export type RegimeTributarioEmpresa = "SN" | "LP" | "LR";

export interface Empresa {
	id: string;
	idproprietario: string;
	nome: string;
	cnpj?: string | null;
	telefone?: string | null;
	email?: string;
	endereco?: string;
	regimetributario?: RegimeTributarioEmpresa | null;
}

interface CriarEmpresa {
	nome: string;
	cnpj: string;
	email: string;
	telefone: string;
	endereco: string;
	idproprietario: string;
}

export interface AtualizarEmpresaData {
	nome?: string;
	cnpj?: string;
	telefone?: string;
	regimetributario?: RegimeTributarioEmpresa | "" | null;
}

interface ListarEmpresasResponse {
	data: Empresa[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export const empresasService = {
	async listar(params?: {
		idusuario?: string;
		idproprietario?: string;
		page?: number;
		limit?: number;
	}): Promise<ListarEmpresasResponse> {
		const { data } = await api.get<ListarEmpresasResponse>("/empresas", {
			params,
		});
		return data;
	},

	async buscar(id: string): Promise<Empresa> {
		const { data } = await api.get<Empresa>(`/empresas/${id}`);
		return data;
	},

	async criar(data: CriarEmpresa): Promise<Empresa> {
		const { data: response } = await api.post<Empresa>("/empresas", data);
		return response;
	},

	async atualizar(id: string, dados: AtualizarEmpresaData): Promise<Empresa> {
		const { data } = await api.put<Empresa>(`/empresas/${id}`, dados);
		return data;
	},
};

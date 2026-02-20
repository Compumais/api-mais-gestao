import { api } from "@/lib/axios";

interface CriarEmpresa {
	nome: string;
	cnpj: string;
	email: string;
	telefone: string;
	endereco: string;
	idproprietario: string;
}

interface Empresa {
	id: string;
	idproprietario: string;
	nome: string;
	email: string;
	endereco: string;
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

	async criar(data: CriarEmpresa): Promise<Empresa> {
		const { data: response } = await api.post<Empresa>("/empresas", data);
		return response;
	},
};

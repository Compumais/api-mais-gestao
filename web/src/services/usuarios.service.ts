import { api } from "@/lib/axios";

export interface Usuario {
	id: string;
	nome: string;
	email: string;
	perfil: string | string[];
	emailverificado: boolean;
	imagem: string | null;
	criadoem: string;
	atualizadoem: string;
	empresasIds?: string[];
}

export interface ListarUsuariosResponse {
	data: Usuario[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export interface ListarUsuariosParams {
	idempresa: string;
	page?: number;
	limit?: number;
	nome?: string;
	email?: string;
}

export interface CriarUsuarioData {
	nome: string;
	email: string;
	password: string;
	perfil: string | string[];
	empresasIds?: string[];
	idempresa: string;
}

export interface AtualizarUsuarioData {
	nome?: string;
	perfil?: string | string[];
	empresasIds?: string[];
	idempresa: string;
}

export const usuariosService = {
	async listar(params: ListarUsuariosParams): Promise<ListarUsuariosResponse> {
		const { data } = await api.get<ListarUsuariosResponse>("/usuarios", {
			params,
		});
		return data;
	},

	async buscar(id: string): Promise<Usuario> {
		const { data } = await api.get<Usuario>(`/usuarios/${id}`);
		return data;
	},

	async criar(dados: CriarUsuarioData): Promise<Usuario> {
		const { data } = await api.post<Usuario>("/usuarios", dados);
		return data;
	},

	async atualizar(id: string, dados: AtualizarUsuarioData): Promise<Usuario> {
		const { data } = await api.put<Usuario>(`/usuarios/${id}`, dados);
		return data;
	},

	async deletar(id: string, idempresa: string): Promise<void> {
		await api.delete(`/usuarios/${id}`, {
			params: { idempresa },
		});
	},
};

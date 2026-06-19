import { api } from "@/lib/axios";

export interface Entidade {
	id: string;
	idempresa: string;
	nome: string;
	razaosocial: string | null;
	tipopessoa: number | null;
	cnpjcpf: string;
	inscricaoestadual: string | null;
	rg: string | null;
	email: string | null;
	telefone: string | null;
	endereco: string | null;
	numeroendereco: string | null;
	complemento: string | null;
	bairro: string | null;
	idcidade: string | null;
	idestado: string | null;
	cep: string | null;
	fax: string | null;
	nascimento: string | null;
	idplanocontas: string | null;
	pais: string | null;
	cliente: number | null;
	fornecedor: number | null;
	transportador: number | null;
	representante: number | null;
	criadoem: string;
	atualizadoem: string;
}

export interface ListarEntidadesResponse {
	data: Entidade[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export interface CriarEntidadeData {
	idempresa: string;
	nome: string;
	cnpjcpf: string;
	razaosocial?: string | null;
	tipopessoa?: number | null;
	inscricaoestadual?: string | null;
	rg?: string | null;
	email?: string | null;
	telefone?: string | null;
	endereco?: string | null;
	numeroendereco?: string | null;
	complemento?: string | null;
	bairro?: string | null;
	idcidade?: string | null;
	idestado?: string | null;
	cep?: string | null;
	fax?: string | null;
	nascimento?: string | null;
	idplanocontas?: string | null;
	pais?: string | null;
	cliente?: number;
	fornecedor?: number;
	transportador?: number;
	representante?: number;
}

export interface AtualizarEntidadeData {
	nome?: string;
	cnpjcpf?: string;
	razaosocial?: string | null;
	tipopessoa?: number | null;
	inscricaoestadual?: string | null;
	rg?: string | null;
	email?: string | null;
	telefone?: string | null;
	endereco?: string | null;
	numeroendereco?: string | null;
	complemento?: string | null;
	bairro?: string | null;
	idcidade?: string | null;
	idestado?: string | null;
	cep?: string | null;
	fax?: string | null;
	nascimento?: string | null;
	idplanocontas?: string | null;
	pais?: string | null;
	cliente?: number;
	fornecedor?: number;
	transportador?: number;
	representante?: number;
}

export const entidadesService = {
	async listar(params?: {
		idempresa: string;
		page?: number;
		limit?: number;
		nome?: string;
		q?: string;
		email?: string;
		telefone?: string;
	}): Promise<ListarEntidadesResponse> {
		const { data } = await api.get<ListarEntidadesResponse>("/entidades", {
			params,
		});
		return data;
	},

	async buscar(id: string): Promise<Entidade> {
		const { data } = await api.get<Entidade>(`/entidades/${id}`);
		return data;
	},

	async criar(dados: CriarEntidadeData): Promise<Entidade> {
		const { data } = await api.post<Entidade>("/entidades", dados);
		return data;
	},

	async atualizar(id: string, dados: AtualizarEntidadeData): Promise<Entidade> {
		const { data } = await api.put<Entidade>(`/entidades/${id}`, dados);
		return data;
	},

	async deletar(id: string): Promise<void> {
		await api.delete(`/entidades/${id}`);
	},
};

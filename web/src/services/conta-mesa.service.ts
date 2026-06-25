import { api } from "@/lib/axios";

export interface ContaMesa {
	id: string;
	idempresa: string;
	idcliente: string | null;
	dataabertura: string | null;
	desconto: string | null;
	idgarcom: string | null;
	idusuario: string;
	numeromesa: number;
	numeropessoas: number | null;
	observacao: string | null;
	status: number | null;
	telefone: string | null;
	usuarioquefechouconta: string | null;
	valorcartao: string | null;
	valorcouverartistico: string | null;
	valordinheiro: string | null;
	valorpendente: string | null;
	valorpix: string | null;
	valorprepago: string | null;
	valortaxaservico: string | null;
	valortotal: string | null;
	valortroco: string | null;
	datacriacao: string | null;
	dataalteracao: string | null;
}

export interface Paginacao {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}

export interface ListarContasMesaResponse {
	data: ContaMesa[];
	paginacao: Paginacao;
}

export interface CriarContaMesaData {
	idempresa: string;
	idusuario: string;
	numeromesa: number;
	idcliente?: string;
	desconto?: string;
	idgarcom?: string;
	numeropessoas?: number;
	observacao?: string;
	status?: number;
	telefone?: string;
	usuarioquefechouconta?: string;
	valorcartao?: string;
	valorcartaocredito?: string;
	valorcartaodebito?: string;
	valorcouverartistico?: string;
	valordinheiro?: string;
	valorpendente?: string;
	valorpix?: string;
	valorprepago?: string;
	valortaxaservico?: string;
	valortotal?: string;
	valortroco?: string;
}

export interface AtualizarContaMesaData {
	idcliente?: string;
	desconto?: string;
	idgarcom?: string;
	numeropessoas?: number;
	observacao?: string;
	status?: number;
	telefone?: string;
	usuarioquefechouconta?: string;
	valorcartao?: string;
	valorcartaocredito?: string;
	valorcartaodebito?: string;
	valorcouverartistico?: string;
	valordinheiro?: string;
	valorpendente?: string;
	valorpix?: string;
	valorprepago?: string;
	valortaxaservico?: string;
	valortotal?: string;
	valortroco?: string;
}

export const contaMesaService = {
	async listar(params: {
		idempresa: string;
		numeromesa?: number;
		status?: number;
		page?: number;
		limit?: number;
	}): Promise<ListarContasMesaResponse> {
		const { data } = await api.get<ListarContasMesaResponse>("/contas-mesa", {
			params,
		});
		return data;
	},

	async buscar(id: string): Promise<ContaMesa> {
		const { data } = await api.get<ContaMesa>(`/contas-mesa/${id}`);
		return data;
	},

	async criar(dados: CriarContaMesaData): Promise<ContaMesa> {
		const { data } = await api.post<ContaMesa>("/contas-mesa", dados);
		return data;
	},

	async atualizar(
		id: string,
		dados: AtualizarContaMesaData,
	): Promise<ContaMesa> {
		const { data } = await api.put<ContaMesa>(`/contas-mesa/${id}`, dados);
		return data;
	},

	async deletar(id: string): Promise<void> {
		await api.delete(`/contas-mesa/${id}`);
	},
};

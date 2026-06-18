import { api } from "@/lib/axios";

export interface ContaCorrente {
	id: string;
	idempresa: string;
	descricao?: string | null;
	agencia?: string | null;
	numeroconta?: string | null;
	abertura?: string | null;
	observacao?: string | null;
	nometitular?: string | null;
	cnpjcpftitular?: string | null;
	gerente?: string | null;
	telefonegerente?: string | null;
	codigo?: number | null;
	idbanco?: string | null;
	currenttimemillis?: number | null;
}

export interface ContaCorrenteListItem {
	id: string;
	agencia?: string | null;
	descricao?: string | null;
}

export interface ListarContasCorrentesResponse {
	data: ContaCorrenteListItem[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export interface CriarContaCorrenteData {
	idempresa: string;
	descricao?: string;
	agencia?: string;
	numeroconta?: string;
	abertura?: string;
	observacao?: string;
	nometitular?: string;
	cnpjcpftitular?: string;
	gerente?: string;
	telefonegerente?: string;
	codigo?: number;
	idbanco?: string;
}

export interface AtualizarContaCorrenteData {
	descricao?: string | null;
	agencia?: string | null;
	numeroconta?: string | null;
	abertura?: string | null;
	observacao?: string | null;
	nometitular?: string | null;
	cnpjcpftitular?: string | null;
	gerente?: string | null;
	telefonegerente?: string | null;
	codigo?: number | null;
	idbanco?: string | null;
}

export const contasCorrentesService = {
	async listar(params?: {
		idempresa: string;
		page?: number;
		limit?: number;
	}): Promise<ListarContasCorrentesResponse> {
		const { data } = await api.get<ListarContasCorrentesResponse>(
			"/contas-correntes",
			{
				params,
			},
		);
		return data;
	},

	async buscar(id: string): Promise<ContaCorrente> {
		const { data } = await api.get<ContaCorrente>(`/contas-correntes/${id}`);
		return data;
	},

	async criar(dados: CriarContaCorrenteData): Promise<ContaCorrente> {
		const { data } = await api.post<ContaCorrente>("/contas-correntes", dados);
		return data;
	},

	async atualizar(
		id: string,
		dados: AtualizarContaCorrenteData,
	): Promise<ContaCorrente> {
		const { data } = await api.put<ContaCorrente>(
			`/contas-correntes/${id}`,
			dados,
		);
		return data;
	},

	async deletar(id: string): Promise<void> {
		await api.delete(`/contas-correntes/${id}`);
	},

	async buscarProximoCodigo(
		idempresa: string,
	): Promise<{ codigo: number }> {
		const { data } = await api.get<{ codigo: number }>(
			"/contas-correntes/proximo-codigo",
			{ params: { idempresa } },
		);
		return data;
	},
};

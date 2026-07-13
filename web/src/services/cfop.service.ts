import { api } from "@/lib/axios";

export type TipoMovimentoCfop = "E" | "S";

export interface Cfop {
	id: string;
	idempresa: string;
	codigo: string | null;
	descricao: string | null;
	tipoproduto?: string | null;
	currenttimemillis?: number | null;
}

export interface ListarCfopsResponse {
	data: Cfop[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export interface CriarCfopData {
	idempresa: string;
	codigo: string;
	descricao: string;
	tipoproduto?: string | null;
}

export interface AtualizarCfopData {
	codigo?: string;
	descricao?: string;
	tipoproduto?: string | null;
}

export function inferirTipoMovimentoCfop(
	codigo: string | null | undefined,
): TipoMovimentoCfop | null {
	if (!codigo) {
		return null;
	}

	const primeiroDigito = codigo.replace(/\D/g, "")[0];

	if (!primeiroDigito) {
		return null;
	}

	if (["1", "2", "3"].includes(primeiroDigito)) {
		return "E";
	}

	if (["5", "6", "7"].includes(primeiroDigito)) {
		return "S";
	}

	return null;
}

export const cfopService = {
	async listar(params: {
		idempresa: string;
		page?: number;
		limit?: number;
		descricao?: string;
		codigo?: string;
		tipomovimento?: TipoMovimentoCfop;
	}): Promise<ListarCfopsResponse> {
		const { data } = await api.get<ListarCfopsResponse>("/cfops", { params });
		return data;
	},

	async listarTodos(params: {
		idempresa: string;
		descricao?: string;
		codigo?: string;
		tipomovimento?: TipoMovimentoCfop;
	}): Promise<Cfop[]> {
		const limite = 100;
		let pagina = 1;
		const registros: Cfop[] = [];

		while (true) {
			const resposta = await cfopService.listar({
				...params,
				page: pagina,
				limit: limite,
			});

			registros.push(...resposta.data);

			if (pagina >= resposta.paginacao.totalPages) {
				break;
			}

			pagina += 1;
		}

		return registros;
	},

	async buscar(id: string): Promise<Cfop> {
		const { data } = await api.get<Cfop>(`/cfops/${id}`);
		return data;
	},

	async criar(dados: CriarCfopData): Promise<Cfop> {
		const { data } = await api.post<Cfop>("/cfops", dados);
		return data;
	},

	async atualizar(id: string, dados: AtualizarCfopData): Promise<Cfop> {
		const { data } = await api.put<Cfop>(`/cfops/${id}`, dados);
		return data;
	},

	async deletar(id: string): Promise<void> {
		await api.delete(`/cfops/${id}`);
	},
};

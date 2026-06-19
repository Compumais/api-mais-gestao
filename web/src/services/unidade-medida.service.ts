import { api } from "@/lib/axios";

export interface UnidadeMedida {
	id: string;
	idempresa: string | null;
	casasdecimais: number | null;
	codigo: string | null;
	currenttimemillis: number | null;
	nome: string | null;
	tipovalor: number | null;
}

export function isUnidadeMedidaGlobal(unidade: Pick<UnidadeMedida, "idempresa">) {
	return unidade.idempresa === null;
}

export interface ListarUnidadeMedidasResponse {
	data: UnidadeMedida[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export interface CriarUnidadeMedidaData {
	idempresa: string;
	codigo?: string | null;
	nome?: string | null;
}

export interface AtualizarUnidadeMedidaData {
	codigo?: string | null;
	nome?: string | null;
}

export const unidadeMedidaService = {
	async listar(params: {
		idempresa: string;
		page?: number;
		limit?: number;
		nome?: string;
		q?: string;
	}): Promise<ListarUnidadeMedidasResponse> {
		const { data } = await api.get<ListarUnidadeMedidasResponse>(
			"/unidades-medida",
			{ params },
		);
		return data;
	},

	async listarTodos(params: {
		idempresa: string;
		nome?: string;
	}): Promise<UnidadeMedida[]> {
		const limite = 100;
		let pagina = 1;
		const registros: UnidadeMedida[] = [];

		while (true) {
			const resposta = await unidadeMedidaService.listar({
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

	async buscar(id: string): Promise<UnidadeMedida> {
		const { data } = await api.get<UnidadeMedida>(`/unidades-medida/${id}`);
		return data;
	},

	async criar(dados: CriarUnidadeMedidaData): Promise<UnidadeMedida> {
		const { data } = await api.post<UnidadeMedida>("/unidades-medida", dados);
		return data;
	},

	async atualizar(
		id: string,
		dados: AtualizarUnidadeMedidaData,
	): Promise<UnidadeMedida> {
		const { data } = await api.put<UnidadeMedida>(
			`/unidades-medida/${id}`,
			dados,
		);
		return data;
	},

	async deletar(id: string): Promise<void> {
		await api.delete(`/unidades-medida/${id}`);
	},

	async buscarProximoCodigo(
		idempresa: string,
	): Promise<{ codigo: string }> {
		const { data } = await api.get<{ codigo: string }>(
			"/unidades-medida/proximo-codigo",
			{ params: { idempresa } },
		);
		return data;
	},
};

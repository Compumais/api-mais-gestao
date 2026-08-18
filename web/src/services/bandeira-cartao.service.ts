import { api } from "@/lib/axios";

export interface BandeiraCartao {
	id: string;
	idempresa: string;
	codigo: string | null;
	descricao: string;
	inativo: number;
}

export interface ListarBandeirasCartaoResponse {
	data: BandeiraCartao[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export const bandeiraCartaoService = {
	async listar(params: {
		idempresa: string;
		page?: number;
		limit?: number;
		inativo?: number;
		descricao?: string;
	}): Promise<ListarBandeirasCartaoResponse> {
		const { data } = await api.get<ListarBandeirasCartaoResponse>(
			"/bandeiras-cartao",
			{ params },
		);
		return data;
	},

	async listarTodos(params: {
		idempresa: string;
		inativo?: number;
		descricao?: string;
	}): Promise<BandeiraCartao[]> {
		const limite = 100;
		let pagina = 1;
		const registros: BandeiraCartao[] = [];

		while (true) {
			const resposta = await bandeiraCartaoService.listar({
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

	async popularPadrao(idempresa: string): Promise<{
		criados: number;
		data: BandeiraCartao[];
	}> {
		const { data } = await api.post<{
			criados: number;
			data: BandeiraCartao[];
		}>("/bandeiras-cartao/popular-padrao", { idempresa });
		return data;
	},

	async criar(dados: {
		idempresa: string;
		descricao: string;
		codigo?: string | null;
		inativo?: number;
	}): Promise<BandeiraCartao> {
		const { data } = await api.post<BandeiraCartao>("/bandeiras-cartao", dados);
		return data;
	},

	async atualizar(
		id: string,
		dados: {
			descricao?: string;
			codigo?: string | null;
			inativo?: number;
		},
	): Promise<BandeiraCartao> {
		const { data } = await api.put<BandeiraCartao>(
			`/bandeiras-cartao/${id}`,
			dados,
		);
		return data;
	},

	async deletar(id: string): Promise<void> {
		await api.delete(`/bandeiras-cartao/${id}`);
	},
};

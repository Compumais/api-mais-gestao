import { api } from "@/lib/axios";

export interface TaxaUf {
	id: string;
	idempresa: string;
	codigo: string;
	descricao: string;
	baseicms: string | null;
	baseicmsfe: string | null;
	baseicmsst: string | null;
	uf_ac: string | null;
	uf_al: string | null;
	uf_am: string | null;
	uf_ap: string | null;
	uf_ba: string | null;
	uf_ce: string | null;
	uf_df: string | null;
	uf_es: string | null;
	uf_go: string | null;
	uf_ma: string | null;
	uf_mg: string | null;
	uf_ms: string | null;
	uf_mt: string | null;
	uf_pa: string | null;
	uf_pb: string | null;
	uf_pe: string | null;
	uf_pi: string | null;
	uf_pr: string | null;
	uf_rj: string | null;
	uf_rn: string | null;
	uf_ro: string | null;
	uf_rr: string | null;
	uf_rs: string | null;
	uf_sc: string | null;
	uf_se: string | null;
	uf_sp: string | null;
	uf_to: string | null;
	baseiss: string | null;
	iss: string | null;
	pordif: string | null;
	bcporuf: string | null;
	inativo: number | null;
}

export interface ListarTaxaUfResponse {
	data: TaxaUf[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export type CriarTaxaUfData = {
	idempresa: string;
	codigo: string;
	descricao: string;
	baseicms?: string | null;
	baseicmsfe?: string | null;
	baseicmsst?: string | null;
	baseiss?: string | null;
	iss?: string | null;
	pordif?: string | null;
	bcporuf?: string | null;
	inativo?: number;
	[key: string]: string | number | null | undefined;
};

export const taxaUfService = {
	async listar(params: {
		idempresa: string;
		page?: number;
		limit?: number;
		busca?: string;
		inativo?: number;
	}): Promise<ListarTaxaUfResponse> {
		const { data } = await api.get<ListarTaxaUfResponse>("/taxas-uf", {
			params,
		});
		return data;
	},

	async listarTodos(params: {
		idempresa: string;
		busca?: string;
	}): Promise<TaxaUf[]> {
		const limite = 100;
		let pagina = 1;
		const registros: TaxaUf[] = [];

		while (true) {
			const resposta = await taxaUfService.listar({
				...params,
				page: pagina,
				limit: limite,
				inativo: 0,
			});

			registros.push(...resposta.data);

			if (pagina >= resposta.paginacao.totalPages) {
				break;
			}

			pagina += 1;
		}

		return registros;
	},

	async buscar(id: string, idempresa: string): Promise<TaxaUf> {
		const { data } = await api.get<TaxaUf>(`/taxas-uf/${id}`, {
			params: { idempresa },
		});
		return data;
	},

	async criar(dados: CriarTaxaUfData): Promise<TaxaUf> {
		const { data } = await api.post<TaxaUf>("/taxas-uf", dados);
		return data;
	},

	async atualizar(
		id: string,
		idempresa: string,
		dados: Partial<CriarTaxaUfData>,
	): Promise<TaxaUf> {
		const { data } = await api.put<TaxaUf>(`/taxas-uf/${id}`, dados, {
			params: { idempresa },
		});
		return data;
	},

	async excluir(id: string, idempresa: string): Promise<void> {
		await api.delete(`/taxas-uf/${id}`, { params: { idempresa } });
	},
};

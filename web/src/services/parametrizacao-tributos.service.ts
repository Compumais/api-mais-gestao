import { api } from "@/lib/axios";

export interface ParametrizacaoTributos {
	id: string;
	idempresa: string;
	codigocfopentrada: string | null;
	cstentrada: string | null;
	csosnentrada: string | null;
	ncm: string | null;
	taxaicmsentrada: string | null;
	uf: string | null;
	ignorarprimeirodigitocst: number | null;
	idcfopsaidanfe: string | null;
	cstnfe: string | null;
	csosnnfe: string | null;
	taxaicmsnfe: string | null;
	idcfopsaidanfce: string | null;
	cstnfce: string | null;
	csosnnfce: string | null;
	taxaicmsnfce: string | null;
	aliquotapis: string | null;
	cstpis: string | null;
	aliquotacofins: string | null;
	cstcofins: string | null;
	cstipi: string | null;
	idenquadramentoipi: string | null;
	percentualmva: string | null;
	percentualirrf: string | null;
	tipoproduto: string | null;
	inativo: number | null;
}

export interface ListarParametrizacaoTributosResponse {
	data: ParametrizacaoTributos[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export interface CriarParametrizacaoTributosData {
	idempresa: string;
	codigocfopentrada: string;
	cstentrada?: string | null;
	csosnentrada?: string | null;
	ncm?: string | null;
	taxaicmsentrada?: string | null;
	uf?: string | null;
	ignorarprimeirodigitocst?: number | null;
	idcfopsaidanfe?: string | null;
	cstnfe?: string | null;
	csosnnfe?: string | null;
	taxaicmsnfe?: string | null;
	idcfopsaidanfce?: string | null;
	cstnfce?: string | null;
	csosnnfce?: string | null;
	taxaicmsnfce?: string | null;
	aliquotapis?: string | null;
	cstpis?: string | null;
	aliquotacofins?: string | null;
	cstcofins?: string | null;
	cstipi?: string | null;
	idenquadramentoipi?: string | null;
	percentualmva?: string | null;
	percentualirrf?: string | null;
	tipoproduto?: string | null;
}

export type AtualizarParametrizacaoTributosData = Omit<
	CriarParametrizacaoTributosData,
	"idempresa"
>;

export const parametrizacaoTributosService = {
	async listar(params: {
		idempresa: string;
		page?: number;
		limit?: number;
		busca?: string;
	}): Promise<ListarParametrizacaoTributosResponse> {
		const { data } = await api.get<ListarParametrizacaoTributosResponse>(
			"/parametrizacao-tributos",
			{ params },
		);
		return data;
	},

	async buscar(id: string, idempresa: string): Promise<ParametrizacaoTributos> {
		const { data } = await api.get<ParametrizacaoTributos>(
			`/parametrizacao-tributos/${id}`,
			{ params: { idempresa } },
		);
		return data;
	},

	async criar(
		dados: CriarParametrizacaoTributosData,
	): Promise<ParametrizacaoTributos> {
		const { data } = await api.post<ParametrizacaoTributos>(
			"/parametrizacao-tributos",
			dados,
		);
		return data;
	},

	async atualizar(
		id: string,
		dados: AtualizarParametrizacaoTributosData & { idempresa: string },
	): Promise<ParametrizacaoTributos> {
		const { data } = await api.put<ParametrizacaoTributos>(
			`/parametrizacao-tributos/${id}`,
			dados,
		);
		return data;
	},

	async excluir(id: string, idempresa: string): Promise<void> {
		await api.delete(`/parametrizacao-tributos/${id}`, {
			params: { idempresa },
		});
	},
};

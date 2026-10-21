import { api } from "@/lib/axios";

export interface CentroCusto {
	id: string;
	idempresa: string;
	nome: string;
	codigoextenso: string | null;
	codigoreduzido: string | null;
	inativo: number | null;
	obrigatorio: number | null;
	idcentrocustopai: string | null;
	nivelcentro: number | null;
	descricao: string | null;
	iddepartamento: string | null;
	idresponsavel: string | null;
	datainiciovigencia: string | null;
	datafimvigencia: string | null;
	tipogestao: string | null;
	observacao: string | null;
	currenttimemillis: number;
}

export type CentroCustoNoArvore = CentroCusto & {
	filhos: CentroCustoNoArvore[];
};

export interface ListarCentrosCustoResponse {
	data: CentroCusto[] | CentroCustoNoArvore[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export interface CriarCentroCustoData {
	idempresa: string;
	nome: string;
	codigoextenso?: string;
	codigoreduzido?: string;
	inativo?: number;
	obrigatorio?: number;
	idcentrocustopai?: string;
	descricao?: string | null;
	iddepartamento?: string | null;
	idresponsavel?: string | null;
	datainiciovigencia?: string | null;
	datafimvigencia?: string | null;
	tipogestao?: string | null;
	observacao?: string | null;
}

export type AtualizarCentroCustoData = Partial<
	Omit<CriarCentroCustoData, "idempresa">
>;

export interface ConfigFinanceiroEmpresa {
	id?: string;
	idempresa: string;
	competenciadataref: "emissao" | "vencimento";
	percentualtoleranciaorcamentocc: string;
	bloqueardespesaacimaorcamento: boolean;
}

export interface AtualizarConfigFinanceiroEmpresaData {
	idempresa: string;
	competenciadataref?: "emissao" | "vencimento";
	percentualtoleranciaorcamentocc?: number;
	bloqueardespesaacimaorcamento?: boolean;
}

export const centroCustoService = {
	async listar(params: {
		idempresa: string;
		nome?: string;
		inativo?: number;
		page?: number;
		limit?: number;
		formato?: "lista" | "arvore";
	}): Promise<ListarCentrosCustoResponse> {
		const { data } = await api.get<ListarCentrosCustoResponse>(
			"/centros-custo",
			{ params },
		);
		return data;
	},

	async buscar(id: string): Promise<CentroCusto> {
		const { data } = await api.get<CentroCusto>(`/centros-custo/${id}`);
		return data;
	},

	async criar(dados: CriarCentroCustoData): Promise<CentroCusto> {
		const { data } = await api.post<CentroCusto>("/centros-custo", dados);
		return data;
	},

	async atualizar(
		id: string,
		dados: AtualizarCentroCustoData,
	): Promise<CentroCusto> {
		const { data } = await api.put<CentroCusto>(`/centros-custo/${id}`, dados);
		return data;
	},

	async deletar(id: string): Promise<void> {
		await api.delete(`/centros-custo/${id}`);
	},

	async buscarConfigFinanceiro(
		idempresa: string,
	): Promise<ConfigFinanceiroEmpresa> {
		const { data } = await api.get<ConfigFinanceiroEmpresa>(
			"/config-financeiro-empresa",
			{ params: { idempresa } },
		);
		return data;
	},

	async salvarConfigFinanceiro(
		dados: AtualizarConfigFinanceiroEmpresaData,
	): Promise<ConfigFinanceiroEmpresa> {
		const { data } = await api.put<ConfigFinanceiroEmpresa>(
			"/config-financeiro-empresa",
			dados,
		);
		return data;
	},
};

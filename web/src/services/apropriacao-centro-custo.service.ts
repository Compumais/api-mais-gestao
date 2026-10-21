import { api } from "@/lib/axios";
import type { RegimeApropriacao } from "@/constants/centro-custo-constants";

export type OrigemTipoApropriacao =
	| "financeiro"
	| "financeiro_lancamento"
	| "conta_corrente_lancamento"
	| "nota_fiscal"
	| "ordem_servico"
	| "manual";

export interface LinhaApropriacaoCentroCusto {
	idcentrocusto: string;
	valor?: number;
	percentual?: number | null;
}

export interface ApropriacaoCentroCustoRegistro {
	id: string;
	idempresa: string;
	idcentrocusto: string;
	origemtipo: string;
	origemid: string;
	regime: string;
	valor: string;
	percentual: string | null;
	idplanocontas: string | null;
	datalancamento: string | null;
}

export interface FinanceiroSemApropriacao {
	id: string;
	documento: string | null;
	historico: string | null;
	valor: string | null;
	emissao: string | null;
	vencimento: string | null;
	idplanocontas: string | null;
}

export interface SalvarApropriacaoCentroCustoData {
	idempresa: string;
	origemtipo: OrigemTipoApropriacao;
	origemid: string;
	regime: RegimeApropriacao;
	linhas: LinhaApropriacaoCentroCusto[];
	idcriteriorateio?: string | null;
}

export const apropriacaoCentroCustoService = {
	async listarPorOrigem(params: {
		idempresa: string;
		origemtipo: OrigemTipoApropriacao;
		origemid: string;
		regime?: RegimeApropriacao;
	}): Promise<{ data: ApropriacaoCentroCustoRegistro[] }> {
		const { data } = await api.get<{ data: ApropriacaoCentroCustoRegistro[] }>(
			"/apropriacoes-centro-custo",
			{ params },
		);
		return data;
	},

	async salvar(
		dados: SalvarApropriacaoCentroCustoData,
	): Promise<{ data: ApropriacaoCentroCustoRegistro[] }> {
		const { data } = await api.post<{ data: ApropriacaoCentroCustoRegistro[] }>(
			"/apropriacoes-centro-custo",
			dados,
		);
		return data;
	},

	async listarPendentes(params: {
		idempresa: string;
		page?: number;
		limit?: number;
	}): Promise<{ data: FinanceiroSemApropriacao[] }> {
		const { data } = await api.get<{ data: FinanceiroSemApropriacao[] }>(
			"/apropriacoes-centro-custo/pendentes",
			{ params },
		);
		return data;
	},
};

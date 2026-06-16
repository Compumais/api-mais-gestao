import { api } from "@/lib/axios";
import type { Paginacao } from "@/services/conta-mesa.service";

export interface FechamentoCaixa {
	id: number;
	idempresa: string;
	codigo: string | null;
	datacriacao: string | null;
	datamodificacao: string | null;
	datahora: string | null;
	falta: string | null;
	idoperacao: number | null;
	idusuario: string | null;
	idusuariofechamento: string | null;
	idusuariosuprimento: string | null;
	local: number | null;
	novofechamento: number | null;
	observacao: string | null;
	pdv: number | null;
	saldoapurado: string | null;
	saldoconferido: string | null;
	saldoinformado: string | null;
	sobra: string | null;
	status: number | null;
	suprimentoinicial: string | null;
}

export interface ListarFechamentosCaixaResponse {
	data: FechamentoCaixa[];
	paginacao: Paginacao;
}

export interface CriarFechamentoCaixaData {
	idempresa: string;
	codigo?: string | null;
	datahora?: string | null;
	falta?: string | null;
	idoperacao?: number | null;
	idusuario?: string | null;
	idusuariofechamento?: string | null;
	idusuariosuprimento?: string | null;
	local?: number | null;
	novofechamento?: number | null;
	observacao?: string | null;
	pdv?: number | null;
	saldoapurado?: string | null;
	saldoconferido?: string | null;
	saldoinformado?: string | null;
	sobra?: string | null;
	status?: number | null;
	suprimentoinicial?: string | null;
}

export interface AtualizarFechamentoCaixaData {
	codigo?: string | null;
	datahora?: string | null;
	falta?: string | null;
	idoperacao?: number | null;
	idusuario?: string | null;
	idusuariofechamento?: string | null;
	idusuariosuprimento?: string | null;
	local?: number | null;
	novofechamento?: number | null;
	observacao?: string | null;
	pdv?: number | null;
	saldoapurado?: string | null;
	saldoconferido?: string | null;
	saldoinformado?: string | null;
	sobra?: string | null;
	status?: number | null;
	suprimentoinicial?: string | null;
}

export const fechamentoCaixaService = {
	async listar(params: {
		idempresa: string;
		page?: number;
		limit?: number;
		codigo?: string;
		idusuario?: string;
		pdv?: number;
		status?: number;
	}): Promise<ListarFechamentosCaixaResponse> {
		const { data } = await api.get<ListarFechamentosCaixaResponse>(
			"/fechamentos-caixa",
			{ params },
		);
		return data;
	},

	async buscar(id: number): Promise<FechamentoCaixa> {
		const { data } = await api.get<FechamentoCaixa>(
			`/fechamentos-caixa/${id}`,
		);
		return data;
	},

	async criar(dados: CriarFechamentoCaixaData): Promise<FechamentoCaixa> {
		const { data } = await api.post<FechamentoCaixa>(
			"/fechamentos-caixa",
			dados,
		);
		return data;
	},

	async atualizar(
		id: number,
		dados: AtualizarFechamentoCaixaData,
	): Promise<FechamentoCaixa> {
		const { data } = await api.put<FechamentoCaixa>(
			`/fechamentos-caixa/${id}`,
			dados,
		);
		return data;
	},

	async deletar(id: number): Promise<void> {
		await api.delete(`/fechamentos-caixa/${id}`);
	},
};

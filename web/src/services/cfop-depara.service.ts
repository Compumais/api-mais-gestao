import { api } from "@/lib/axios";

export interface CfopDePara {
	id: string;
	idempresa: string;
	idcfopentrada: string | null;
	idcfopsaida: string | null;
	codigoentrada: string | null;
	codigosaida: string | null;
	uf: string | null;
	inativo: number | null;
}

export interface ListarCfopDeParaResponse {
	data: CfopDePara[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export interface CriarCfopDeParaData {
	idempresa: string;
	idcfopentrada: string;
	idcfopsaida: string;
	uf?: string | null;
}

export interface AtualizarCfopDeParaData {
	idempresa: string;
	idcfopentrada: string;
	idcfopsaida: string;
	uf?: string | null;
}

export const cfopDeParaService = {
	async listar(params: {
		idempresa: string;
		page?: number;
		limit?: number;
	}): Promise<ListarCfopDeParaResponse> {
		const { data } = await api.get<ListarCfopDeParaResponse>("/cfop-depara", {
			params,
		});
		return data;
	},

	async criar(dados: CriarCfopDeParaData): Promise<CfopDePara> {
		const { data } = await api.post<CfopDePara>("/cfop-depara", dados);
		return data;
	},

	async atualizar(
		id: string,
		dados: AtualizarCfopDeParaData,
	): Promise<CfopDePara> {
		const { data } = await api.patch<CfopDePara>(`/cfop-depara/${id}`, dados);
		return data;
	},

	async excluir(id: string, idempresa: string): Promise<void> {
		await api.delete(`/cfop-depara/${id}`, {
			params: { idempresa },
		});
	},
};

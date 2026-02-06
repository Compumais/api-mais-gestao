import { api } from "@/lib/axios";

export interface Auditoria {
	id: string;
	acao: string;
	recurso: string;
	idrecurso: string | null;
	idusuario: string | null;
	idempresa: string | null;
	metadados: Record<string, unknown> | null;
	criadoem: string;
}

export interface ListarAuditoriasResponse {
	data: Auditoria[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export interface ListarAuditoriasParams {
	page?: number;
	limit?: number;
	idempresa: string;
}

export const auditoriaService = {
	async listar(
		params: ListarAuditoriasParams,
	): Promise<ListarAuditoriasResponse> {
		const { data } = await api.get<ListarAuditoriasResponse>("/auditoria", {
			params,
		});
		return data;
	},
};


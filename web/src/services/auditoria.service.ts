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
	nomeusuario: string | null;
	nomeempresa: string | null;
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
	acao?: string;
	recurso?: string;
	idrecurso?: string;
	nomeusuario?: string;
	nomeempresa?: string;
	criadoem?: string;
	ordenarPor?: string;
	ordem?: "asc" | "desc";
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

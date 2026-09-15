import type { Auditoria } from "@/model/auditoria-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	listarAuditorias,
	type OrdenarAuditoriaCampo,
} from "@/repositories/auditoria-repositories.js";
import { httpOk } from "@/util/http-util.js";

type AuditoriaListagem = Auditoria & {
	nomeusuario: string | null;
	nomeempresa: string | null;
};

interface ListarAuditoriasServiceParams {
	idempresa?: string;
	acao?: string | undefined;
	recurso?: string | undefined;
	idrecurso?: string | undefined;
	nomeusuario?: string | undefined;
	nomeempresa?: string | undefined;
	criadoem?: string | undefined;
	ordenarPor?: OrdenarAuditoriaCampo | undefined;
	ordem?: "asc" | "desc" | undefined;
	page?: number;
	limit?: number;
}

interface ListarAuditoriasServiceResponta {
	data: AuditoriaListagem[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export async function ListarAuditoriasService({
	idempresa,
	acao,
	recurso,
	idrecurso,
	nomeusuario,
	nomeempresa,
	criadoem,
	ordenarPor,
	ordem,
	limit = 100,
	page = 1,
}: ListarAuditoriasServiceParams): Promise<
	HttpResponse<ListarAuditoriasServiceResponta>
> {
	const { auditorias, totalCount } = await listarAuditorias({
		idempresa,
		acao,
		recurso,
		idrecurso,
		nomeusuario,
		nomeempresa,
		criadoem,
		ordenarPor,
		ordem,
		limit,
		page,
	});

	const totalPages = Math.ceil(totalCount / limit);

	return httpOk<ListarAuditoriasServiceResponta>({
		data: auditorias,
		paginacao: {
			page,
			limit,
			total: totalCount,
			totalPages,
		},
	});
}

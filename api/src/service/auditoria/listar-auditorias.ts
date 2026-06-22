import type { Auditoria } from "@/model/auditoria-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { listarAuditorias } from "@/repositories/auditoria-repositories.js";
import { httpOk } from "@/util/http-util.js";

type AuditoriaListagem = Auditoria & {
	nomeusuario: string | null;
	nomeempresa: string | null;
};

interface ListarAuditoriasServiceParams {
	idempresa?: string;
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
	limit = 100,
	page = 1,
}: ListarAuditoriasServiceParams): Promise<
	HttpResponse<ListarAuditoriasServiceResponta>
> {
	const params: {
		limit: number;
		page: number;
		idempresa?: string;
	} = {
		limit,
		page,
	};

	if (idempresa !== undefined) {
		params.idempresa = idempresa;
	}

	const { auditorias, totalCount } = await listarAuditorias(params);

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

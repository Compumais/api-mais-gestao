import type { Auditoria } from "@/model/auditoria-model";
import type { HttpResponse } from "@/model/http-model";
import { listarAuditorias } from "@/repositories/auditoria-repositories";
import { httpOk } from "@/util/http-util";

interface ListarAuditoriasServiceParams {
	empresaId?: string;
	page?: number;
	limit?: number;
}

interface ListarAuditoriasServiceResponta {
	data: Auditoria[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export async function ListarAuditoriasService({
	empresaId,
	limit = 100,
	page = 1,
}: ListarAuditoriasServiceParams): Promise<
	HttpResponse<ListarAuditoriasServiceResponta>
> {
	const params: {
		limit: number;
		page: number;
		empresaId?: string;
	} = {
		limit,
		page,
	};

	if (empresaId !== undefined) {
		params.empresaId = empresaId;
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

import type { HttpResponse } from "@/model/http-model.js";
import type { ConciliacaoCielo } from "@/model/conciliacao-cielo-model.js";
import { listarConciliacoesCielo } from "@/repositories/conciliacao-cielo-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

export async function listarConciliacoesCieloService(parametros: {
	idempresa: string;
	idusuario: string;
	page?: number;
	limit?: number;
}): Promise<
	HttpResponse<{
		data: ConciliacaoCielo[];
		paginacao: {
			page: number;
			limit: number;
			total: number;
			totalPages: number;
		};
	}>
> {
	const pertence = await verificarUsuarioPertenceEmpresa(
		parametros.idusuario,
		parametros.idempresa,
	);
	if (!pertence) return httpProibido();

	const page = parametros.page ?? 1;
	const limit = parametros.limit ?? 20;
	const resultado = await listarConciliacoesCielo({
		idempresa: parametros.idempresa,
		page,
		limit,
	});

	return httpOk({
		data: resultado.data,
		paginacao: {
			page,
			limit,
			total: resultado.total,
			totalPages: Math.max(1, Math.ceil(resultado.total / limit)),
		},
	});
}

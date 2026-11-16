import type { HttpResponse } from "@/model/http-model.js";
import type { RetornoBancario } from "@/model/retorno-bancario-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { listarRetornosBancarios } from "@/repositories/retorno-bancario-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

type ListarRetornosParametros = {
	idempresa: string;
	idusuario: string;
	idcontacorrente?: string | undefined;
	status?: string | undefined;
	page?: number;
	limit?: number;
};

export async function listarRetornosBancariosService({
	idempresa,
	idusuario,
	idcontacorrente,
	status,
	page = 1,
	limit = 20,
}: ListarRetornosParametros): Promise<
	HttpResponse<{
		data: RetornoBancario[];
		paginacao: {
			page: number;
			limit: number;
			total: number;
			totalPages: number;
		};
	}>
> {
	const pertence = await verificarUsuarioPertenceEmpresa(idusuario, idempresa);
	if (!pertence) return httpProibido();

	const { retornos, total } = await listarRetornosBancarios({
		idempresa,
		idcontacorrente,
		status,
		page,
		limit,
	});

	return httpOk({
		data: retornos,
		paginacao: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit) || 0,
		},
	});
}

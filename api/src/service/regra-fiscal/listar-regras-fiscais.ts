import type { HttpResponse } from "@/model/http-model.js";
import type { StatusRegraFiscal } from "@/model/regra-fiscal-model.js";
import {
	listarRegrasFiscais,
	type RegraFiscal,
} from "@/repositories/regra-fiscal-repositories.js";
import { httpOk } from "@/util/http-util.js";

type ListarRegrasFiscaisParametros = {
	busca?: string | undefined;
	status?: StatusRegraFiscal | undefined;
	page?: number;
	limit?: number;
};

export async function listarRegrasFiscaisService({
	busca,
	status,
	page = 1,
	limit = 20,
}: ListarRegrasFiscaisParametros): Promise<
	HttpResponse<{
		data: RegraFiscal[];
		paginacao: {
			page: number;
			limit: number;
			total: number;
			totalPages: number;
		};
	}>
> {
	const { registros, total } = await listarRegrasFiscais({
		busca,
		status,
		page,
		limit,
	});

	return httpOk({
		data: registros,
		paginacao: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit) || 1,
		},
	});
}

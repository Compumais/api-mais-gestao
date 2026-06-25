import type { HttpResponse } from "@/model/http-model.js";
import {
	listarParametrizacaoTributos,
	type ParametrizacaoTributos,
} from "@/repositories/parametrizacao-tributos-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

type ListarParametrizacaoTributosParametros = {
	idempresa: string;
	idusuario: string;
	busca?: string | undefined;
	page?: number;
	limit?: number;
};

export async function listarParametrizacaoTributosService({
	idempresa,
	idusuario,
	busca,
	page = 1,
	limit = 10,
}: ListarParametrizacaoTributosParametros): Promise<
	HttpResponse<{
		data: ParametrizacaoTributos[];
		paginacao: {
			page: number;
			limit: number;
			total: number;
			totalPages: number;
		};
	}>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const { registros, total } = await listarParametrizacaoTributos({
		idempresa,
		busca,
		page,
		limit,
	});

	return httpOk({
		data: registros,
		paginacao: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	});
}

import type { Hierarquia } from "@/model/hierarquia-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { listarHierarquias } from "@/repositories/hierarquia-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

type ListarHierarquiasParametros = {
	idusuario: string;
	idempresa: string;
	nome?: string | undefined;
	page?: number;
	limit?: number;
};

type ListarHierarquiasResposta = {
	data: Hierarquia[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarHierarquiasService({
	idusuario,
	idempresa,
	nome,
	page = 1,
	limit = 10,
}: ListarHierarquiasParametros): Promise<
	HttpResponse<ListarHierarquiasResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const resultado = await listarHierarquias({
		idempresa,
		nome,
		page,
		limit,
	});

	const total = resultado.total ?? 0;
	const totalPages = Math.ceil(total / limit);

	return httpOk<ListarHierarquiasResposta>({
		data: resultado.hierarquias,
		paginacao: {
			page,
			limit,
			total,
			totalPages,
		},
	});
}

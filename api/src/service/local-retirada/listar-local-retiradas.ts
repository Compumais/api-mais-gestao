import type { HttpResponse } from "@/model/http-model.js";
import type { LocalRetirada } from "@/model/local-retirada-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { listarLocaisRetirada } from "@/repositories/local-retirada-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

type ListarLocalRetiradasParametros = {
	idusuario: string;
	idempresa: string;
	descricao?: string | undefined;
	page?: number;
	limit?: number;
};

type ListarLocalRetiradasResposta = {
	data: LocalRetirada[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarLocalRetiradasService({
	idusuario,
	idempresa,
	descricao,
	page = 1,
	limit = 10,
}: ListarLocalRetiradasParametros): Promise<
	HttpResponse<ListarLocalRetiradasResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const resultado = await listarLocaisRetirada({
		idempresa,
		descricao,
		page,
		limit,
	});

	const total = resultado.total ?? 0;
	const totalPages = Math.ceil(total / limit);

	return httpOk<ListarLocalRetiradasResposta>({
		data: resultado.localretiradas,
		paginacao: {
			page,
			limit,
			total,
			totalPages,
		},
	});
}

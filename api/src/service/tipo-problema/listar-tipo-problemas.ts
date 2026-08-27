import type { HttpResponse } from "@/model/http-model.js";
import type { TipoProblema } from "@/model/tipo-problema-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	listarTiposProblema,
	type OrdenarTiposProblemaCampo,
} from "@/repositories/tipo-problema-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

type ListarTipoProblemasParametros = {
	idusuario: string;
	idempresa: string;
	descricao?: string | undefined;
	codigo?: string | undefined;
	inativo?: number | undefined;
	ordenarPor?: OrdenarTiposProblemaCampo | undefined;
	ordem?: "asc" | "desc" | undefined;
	page?: number;
	limit?: number;
};

type ListarTipoProblemasResposta = {
	data: TipoProblema[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarTipoProblemasService({
	idusuario,
	idempresa,
	descricao,
	codigo,
	inativo,
	ordenarPor,
	ordem,
	page = 1,
	limit = 10,
}: ListarTipoProblemasParametros): Promise<
	HttpResponse<ListarTipoProblemasResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const resultado = await listarTiposProblema({
		idempresa,
		descricao,
		codigo,
		inativo,
		ordenarPor,
		ordem,
		page,
		limit,
	});

	const total = resultado.total ?? 0;
	const totalPages = Math.ceil(total / limit);

	return httpOk<ListarTipoProblemasResposta>({
		data: resultado.tiposproblema,
		paginacao: {
			page,
			limit,
			total,
			totalPages,
		},
	});
}

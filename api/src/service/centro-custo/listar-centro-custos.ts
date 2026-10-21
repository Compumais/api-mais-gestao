import type { CentroCusto } from "@/model/centro-custo-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	listarCentrosCusto,
	listarTodosCentrosCusto,
} from "@/repositories/centro-custo-repositories.js";
import { montarArvoreCentrosCusto } from "@/util/centro-custo-arvore.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

type ListarCentrosCustoParametros = {
	idusuario: string;
	idempresa: string;
	nome?: string | undefined;
	inativo?: number | undefined;
	page?: number;
	limit?: number;
	formato?: "lista" | "arvore";
};

type ListarCentroCustosResposta = {
	data: CentroCusto[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarCentroCustosService({
	idusuario,
	idempresa,
	nome,
	inativo,
	page = 1,
	limit = 10,
	formato = "lista",
}: ListarCentrosCustoParametros): Promise<
	HttpResponse<ListarCentroCustosResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	if (formato === "arvore") {
		const itens = await listarTodosCentrosCusto({ idempresa, inativo });
		return httpOk({
			data: montarArvoreCentrosCusto(itens),
			paginacao: {
				page: 1,
				limit: itens.length,
				total: itens.length,
				totalPages: 1,
			},
		});
	}

	const resultado = await listarCentrosCusto({
		idempresa,
		nome,
		inativo,
		page,
		limit,
	});

	const total = resultado.total ?? 0;
	const totalPages = Math.ceil(total / limit);

	return httpOk<ListarCentroCustosResposta>({
		data: resultado.centrocustos,
		paginacao: {
			page,
			limit,
			total,
			totalPages,
		},
	});
}

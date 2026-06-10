import type { ReceitaSemContribuicao } from "@/model/receita-sem-contribuicao-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { listarReceitasSemContribuicao } from "@/repositories/receita-sem-contribuicao-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

type ListarReceitaSemContribuicaosParametros = {
	idusuario: string;
	idempresa: string;
	descricao?: string | undefined;
	page?: number;
	limit?: number;
};

type ListarReceitaSemContribuicaosResposta = {
	data: ReceitaSemContribuicao[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarReceitaSemContribuicaosService({
	idusuario,
	idempresa,
	descricao,
	page = 1,
	limit = 10,
}: ListarReceitaSemContribuicaosParametros): Promise<
	HttpResponse<ListarReceitaSemContribuicaosResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const resultado = await listarReceitasSemContribuicao({
		idempresa,
		descricao,
		page,
		limit,
	});

	const total = resultado.total ?? 0;
	const totalPages = Math.ceil(total / limit);

	return httpOk<ListarReceitaSemContribuicaosResposta>({
		data: resultado.receitasemcontribuicao,
		paginacao: {
			page,
			limit,
			total,
			totalPages,
		},
	});
}

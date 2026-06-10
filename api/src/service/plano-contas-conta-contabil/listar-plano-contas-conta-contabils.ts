import type { PlanoContasContaContabil } from "@/model/plano-contas-conta-contabil-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { listarPlanosContasContaContabil } from "@/repositories/plano-contas-conta-contabil-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

type ListarPlanoContasContaContabilsParametros = {
	idusuario: string;
	idempresa: string;
	page?: number;
	limit?: number;
};

type ListarPlanoContasContaContabilsResposta = {
	data: PlanoContasContaContabil[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarPlanoContasContaContabilsService({
	idusuario,
	idempresa,
	page = 1,
	limit = 10,
}: ListarPlanoContasContaContabilsParametros): Promise<
	HttpResponse<ListarPlanoContasContaContabilsResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const resultado = await listarPlanosContasContaContabil({
		idempresa,
		page,
		limit,
	});

	const total = resultado.total ?? 0;
	const totalPages = Math.ceil(total / limit);

	return httpOk<ListarPlanoContasContaContabilsResposta>({
		data: resultado.planoscontascontacontabil,
		paginacao: {
			page,
			limit,
			total,
			totalPages,
		},
	});
}

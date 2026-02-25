import type { HttpResponse } from "@/model/http-model.js";
import type { MotivoBaixaFinanceiro } from "@/model/motivo-baixa-financeiro-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { listarMotivosBaixaFinanceiro } from "@/repositories/motivo-baixa-financeiro-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

interface ListarMotivosBaixaFinanceiroParametros {
	idusuario: string;
	idempresas: string[];
	inativo?: number | undefined;
	limit?: number | undefined;
	page?: number | undefined;
}

interface ListarMotivosBaixaFinanceiroResposta {
	data: MotivoBaixaFinanceiro[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export async function listarMotivosBaixaFinanceiroService({
	idusuario,
	idempresas,
	inativo,
	limit = 10,
	page = 1,
}: ListarMotivosBaixaFinanceiroParametros): Promise<
	HttpResponse<ListarMotivosBaixaFinanceiroResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresas.join(","),
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const resultado = await listarMotivosBaixaFinanceiro({
		idempresas,
		inativo,
		limit,
		page,
	});

	const total = resultado.total ?? 0;
	const totalPages = Math.ceil(total / limit);

	return httpOk<ListarMotivosBaixaFinanceiroResposta>({
		data: resultado.motivosBaixaFinanceiro,
		paginacao: {
			page,
			limit,
			total,
			totalPages,
		},
	});
}

import type { EnquatramentoIPI } from "@/model/enquantramento-ipi-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { listarEnquatramentosIpi } from "@/repositories/enquatramento-ipi-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

type ListarEnquatramentoIpisParametros = {
	idusuario: string;
	idempresa: string;
	descricao?: string | undefined;
	page?: number;
	limit?: number;
};

type ListarEnquatramentoIpisResposta = {
	data: EnquatramentoIPI[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarEnquatramentoIpisService({
	idusuario,
	idempresa,
	descricao,
	page = 1,
	limit = 10,
}: ListarEnquatramentoIpisParametros): Promise<
	HttpResponse<ListarEnquatramentoIpisResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const resultado = await listarEnquatramentosIpi({
		idempresa,
		descricao,
		page,
		limit,
	});

	const total = resultado.total ?? 0;
	const totalPages = Math.ceil(total / limit);

	return httpOk<ListarEnquatramentoIpisResposta>({
		data: resultado.enquatramentosipi,
		paginacao: {
			page,
			limit,
			total,
			totalPages,
		},
	});
}

import type { CfopDePara } from "@/repositories/cfop-depara-repositories.js";
import type { HttpResponse } from "@/model/http-model.js";
import { listarCfopDePara } from "@/repositories/cfop-depara-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

type ListarCfopDeParaParametros = {
	idempresa: string;
	idusuario: string;
	page?: number;
	limit?: number;
};

type ListarCfopDeParaResposta = {
	data: CfopDePara[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarCfopDeParaService({
	idempresa,
	idusuario,
	page = 1,
	limit = 10,
}: ListarCfopDeParaParametros): Promise<HttpResponse<ListarCfopDeParaResposta>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const { registros, total } = await listarCfopDePara({
		idempresa,
		page,
		limit,
	});

	return httpOk<ListarCfopDeParaResposta>({
		data: registros,
		paginacao: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit) || 1,
		},
	});
}

import type { CFOPPadrao } from "@/model/cfop-padrao-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { listarCfopsPadrao } from "@/repositories/cfop-padrao-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

type ListarCfopPadraosParametros = {
	idusuario: string;
	idempresa: string;
	nome?: string | undefined;
	inativo?: number | undefined;
	page?: number;
	limit?: number;
};

type ListarCfopPadraosResposta = {
	data: CFOPPadrao[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarCfopPadraosService({
	idusuario,
	idempresa,
	nome,
	inativo,
	page = 1,
	limit = 10,
}: ListarCfopPadraosParametros): Promise<
	HttpResponse<ListarCfopPadraosResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const resultado = await listarCfopsPadrao({
		idempresa,
		nome,
		inativo,
		page,
		limit,
	});

	const total = resultado.total ?? 0;
	const totalPages = Math.ceil(total / limit);

	return httpOk<ListarCfopPadraosResposta>({
		data: resultado.cfoppadraos,
		paginacao: {
			page,
			limit,
			total,
			totalPages,
		},
	});
}

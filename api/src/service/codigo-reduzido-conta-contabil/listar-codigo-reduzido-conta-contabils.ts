import type { CodigoReduzidoContaContabil } from "@/model/codigo-reduzido-conta-contabil-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { listarCodigosReduzidosContaContabil } from "@/repositories/codigo-reduzido-conta-contabil-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

type ListarCodigoReduzidoContaContabilsParametros = {
	idusuario: string;
	idempresa: string;
	page?: number;
	limit?: number;
};

type ListarCodigoReduzidoContaContabilsResposta = {
	data: CodigoReduzidoContaContabil[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarCodigoReduzidoContaContabilsService({
	idusuario,
	idempresa,
	page = 1,
	limit = 10,
}: ListarCodigoReduzidoContaContabilsParametros): Promise<
	HttpResponse<ListarCodigoReduzidoContaContabilsResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const resultado = await listarCodigosReduzidosContaContabil({
		idempresa,
		page,
		limit,
	});

	const total = resultado.total ?? 0;
	const totalPages = Math.ceil(total / limit);

	return httpOk<ListarCodigoReduzidoContaContabilsResposta>({
		data: resultado.codigosreduzidoscontacontabil,
		paginacao: {
			page,
			limit,
			total,
			totalPages,
		},
	});
}

import type { TipoDocumentoFinanceiro } from "@/model/tipo-documento-financeiro-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { listarTiposDocumentoFinanceiro } from "@/repositories/tipo-documento-financeiro-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

type ListarTipoDocumentoFinanceirosParametros = {
	idusuario: string;
	idempresa: string;
	descricao?: string | undefined;
	inativo?: number | undefined;
	page?: number;
	limit?: number;
};

type ListarTipoDocumentoFinanceirosResposta = {
	data: TipoDocumentoFinanceiro[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarTipoDocumentoFinanceirosService({
	idusuario,
	idempresa,
	descricao,
	inativo,
	page = 1,
	limit = 10,
}: ListarTipoDocumentoFinanceirosParametros): Promise<
	HttpResponse<ListarTipoDocumentoFinanceirosResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const resultado = await listarTiposDocumentoFinanceiro({
		idempresa,
		descricao,
		inativo,
		page,
		limit,
	});

	const total = resultado.total ?? 0;
	const totalPages = Math.ceil(total / limit);

	return httpOk<ListarTipoDocumentoFinanceirosResposta>({
		data: resultado.tiposdocumentofinanceiro,
		paginacao: {
			page,
			limit,
			total,
			totalPages,
		},
	});
}

import type { HttpResponse } from "@/model/http-model.js";
import type { TipoCobranca } from "@/model/tipo-cobranca-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	listarTiposCobranca,
	type OrdenarTiposCobrancaCampo,
} from "@/repositories/tipo-cobranca-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

type ListarTiposCobrancaParametros = {
	idusuario: string;
	idempresa: string;
	codigo?: string | undefined;
	descricao?: string | undefined;
	idtipodocumentofinanceiro?: string | undefined;
	ordenarPor?: OrdenarTiposCobrancaCampo | undefined;
	ordem?: "asc" | "desc" | undefined;
	page?: number;
	limit?: number;
};

type ListarTiposCobrancaResposta = {
	data: TipoCobranca[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarTiposCobrancaService({
	idusuario,
	idempresa,
	codigo,
	descricao,
	idtipodocumentofinanceiro,
	ordenarPor,
	ordem,
	page = 1,
	limit = 10,
}: ListarTiposCobrancaParametros): Promise<
	HttpResponse<ListarTiposCobrancaResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const resultado = await listarTiposCobranca({
		idempresa,
		codigo,
		descricao,
		idtipodocumentofinanceiro,
		ordenarPor,
		ordem,
		page,
		limit,
	});

	const totalPages = Math.ceil(resultado.total / limit);

	return httpOk({
		data: resultado.tiposCobranca,
		paginacao: {
			page,
			limit,
			total: resultado.total,
			totalPages,
		},
	});
}

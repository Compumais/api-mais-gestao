import type { HttpResponse } from "@/model/http-model.js";
import type { TipoContrato } from "@/model/tipo-contrato-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	listarTiposContrato,
	type OrdenarTiposContratoCampo,
} from "@/repositories/tipo-contrato-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

type ListarTiposContratoParametros = {
	idusuario: string;
	idempresa: string;
	codigo?: string | undefined;
	descricao?: string | undefined;
	ordenarPor?: OrdenarTiposContratoCampo | undefined;
	ordem?: "asc" | "desc" | undefined;
	page?: number;
	limit?: number;
};

type ListarTiposContratoResposta = {
	data: TipoContrato[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarTiposContratoService({
	idusuario,
	idempresa,
	codigo,
	descricao,
	ordenarPor,
	ordem,
	page = 1,
	limit = 10,
}: ListarTiposContratoParametros): Promise<
	HttpResponse<ListarTiposContratoResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const resultado = await listarTiposContrato({
		idempresa,
		codigo,
		descricao,
		ordenarPor,
		ordem,
		page,
		limit,
	});

	const totalPages = Math.ceil(resultado.total / limit) || 0;

	return httpOk({
		data: resultado.tiposContrato,
		paginacao: {
			page,
			limit,
			total: resultado.total,
			totalPages,
		},
	});
}

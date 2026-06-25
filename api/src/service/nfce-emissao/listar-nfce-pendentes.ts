import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	listarNfcePendentesPorEmpresa,
	type NfcePendenteListagem,
} from "@/repositories/nota-fiscal-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

type ListarNfcePendentesParametros = {
	idusuario: string;
	idempresa: string;
	page?: number;
	limit?: number;
};

type ListarNfcePendentesResposta = {
	data: NfcePendenteListagem[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarNfcePendentesService({
	idusuario,
	idempresa,
	page = 1,
	limit = 20,
}: ListarNfcePendentesParametros): Promise<
	HttpResponse<ListarNfcePendentesResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const resultado = await listarNfcePendentesPorEmpresa({
		idempresa,
		page,
		limit,
	});

	const total = resultado.total ?? 0;

	return httpOk({
		data: resultado.notas,
		paginacao: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	});
}

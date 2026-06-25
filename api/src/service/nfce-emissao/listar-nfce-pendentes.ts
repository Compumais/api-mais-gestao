import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	listarNfcePorEmpresa,
	type NfceListagem,
} from "@/repositories/nota-fiscal-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

type ListarNfcePendentesParametros = {
	idusuario: string;
	idempresa: string;
	status?: number | undefined;
	page?: number;
	limit?: number;
};

type ListarNfcePendentesResposta = {
	data: NfceListagem[];
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
	status,
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

	const resultado = await listarNfcePorEmpresa({
		idempresa,
		status,
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

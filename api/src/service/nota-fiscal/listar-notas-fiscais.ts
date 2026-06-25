import type { HttpResponse } from "@/model/http-model.js";
import type { NotaFiscal } from "@/model/nota-fiscal-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { listarNotasFiscaisPorEmpresa } from "@/repositories/nota-fiscal-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

type ListarNotasFiscaisParametros = {
	idusuario: string;
	idempresa: string;
	numero?: string | undefined;
	identidade?: string | undefined;
	status?: number | undefined;
	tipoorigem?: number | undefined;
	idcfop?: string | undefined;
	dataInicio?: string | undefined;
	dataFim?: string | undefined;
	rascunho?: boolean | undefined;
	page?: number;
	limit?: number;
};

type ListarNotasFiscaisResposta = {
	data: NotaFiscal[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarNotasFiscaisService({
	idusuario,
	idempresa,
	numero,
	identidade,
	status,
	tipoorigem,
	idcfop,
	dataInicio,
	dataFim,
	rascunho = false,
	page = 1,
	limit = 10,
}: ListarNotasFiscaisParametros): Promise<
	HttpResponse<ListarNotasFiscaisResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const resultado = await listarNotasFiscaisPorEmpresa({
		idempresa,
		numero,
		identidade,
		status,
		tipoorigem,
		idcfop,
		dataInicio,
		dataFim,
		somenteRascunhos: rascunho,
		excluirRascunhos: !rascunho,
		page,
		limit,
	});

	const total = resultado.total ?? 0;
	const totalPages = Math.ceil(total / limit);

	return httpOk<ListarNotasFiscaisResposta>({
		data: resultado.notas,
		paginacao: {
			page,
			limit,
			total,
			totalPages,
		},
	});
}

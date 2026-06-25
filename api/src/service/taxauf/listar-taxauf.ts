import type { TaxaUf } from "@/model/taxauf-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { listarTaxaUf } from "@/repositories/taxauf-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

type ListarTaxaUfParametros = {
	idusuario: string;
	idempresa: string;
	busca?: string | undefined;
	inativo?: number | undefined;
	page?: number;
	limit?: number;
};

type ListarTaxaUfResposta = {
	data: TaxaUf[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarTaxaUfService({
	idusuario,
	idempresa,
	busca,
	inativo,
	page = 1,
	limit = 10,
}: ListarTaxaUfParametros): Promise<HttpResponse<ListarTaxaUfResposta>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const resultado = await listarTaxaUf({
		idempresa,
		busca,
		inativo,
		page,
		limit,
	});

	const total = resultado.total ?? 0;

	return httpOk<ListarTaxaUfResposta>({
		data: resultado.registros,
		paginacao: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	});
}

import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	listarFichasProducao,
	type OrdenarFichasProducaoCampo,
} from "@/repositories/ficha-producao-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

type ListarFichasProducaoParametros = {
	idusuario: string;
	idempresa: string;
	q?: string | undefined;
	codigo?: string | undefined;
	nome?: string | undefined;
	ativo?: number | undefined;
	permiteproducaomassa?: number | undefined;
	producaonavenda?: number | undefined;
	ordenarPor?: OrdenarFichasProducaoCampo | undefined;
	ordem?: "asc" | "desc" | undefined;
	page?: number;
	limit?: number;
};

export async function listarFichasProducaoService({
	idusuario,
	idempresa,
	q,
	codigo,
	nome,
	ativo,
	permiteproducaomassa,
	producaonavenda,
	ordenarPor,
	ordem,
	page = 1,
	limit = 10,
}: ListarFichasProducaoParametros): Promise<HttpResponse<unknown>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);
	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const { fichas, total } = await listarFichasProducao({
		idempresa,
		q,
		codigo,
		nome,
		ativo,
		permiteproducaomassa,
		producaonavenda,
		ordenarPor,
		ordem,
		page,
		limit,
	});

	return httpOk({
		data: fichas,
		paginacao: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit) || 1,
		},
	});
}

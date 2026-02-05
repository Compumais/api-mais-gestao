import type { HttpResponse } from "../../model/http-model";
import {
	type Empresa,
	listarEmpresas,
} from "../../repositories/empresa-repositories";
import { httpOk } from "../../util/http-util";

type ListarEmpresasParametros = {
	idusuario?: string | undefined;
	idproprietario?: string | undefined;
	nome?: string | undefined;
	cnpj?: string | undefined;
	telefone?: string | undefined;
	page?: number;
	limit?: number;
};

type ListarEmpresasResposta = {
	data: Empresa[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarEmpresasService({
	idusuario,
	idproprietario,
	nome,
	cnpj,
	telefone,
	page = 1,
	limit = 10,
}: ListarEmpresasParametros): Promise<HttpResponse<ListarEmpresasResposta>> {
	const { empresas, total } = await listarEmpresas({
		idusuario,
		idproprietario,
		nome,
		cnpj,
		telefone,
		page,
		limit,
	});

	const totalPages = Math.ceil(total / limit);

	return httpOk<ListarEmpresasResposta>({
		data: empresas,
		paginacao: {
			page,
			limit,
			total,
			totalPages,
		},
	});
}

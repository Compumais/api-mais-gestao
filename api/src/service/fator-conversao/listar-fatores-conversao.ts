import type { HttpResponse } from "@/model/http-model.js";
import type { FatorConversao } from "@/model/fator-conversao-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	listarFatoresConversao,
	type OrdenarFatoresConversaoCampo,
} from "@/repositories/fator-conversao-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

type ListarFatoresConversaoParametros = {
	idusuario: string;
	idempresa: string;
	q?: string | undefined;
	nome?: string | undefined;
	fator?: string | undefined;
	ordenarPor?: OrdenarFatoresConversaoCampo | undefined;
	ordem?: "asc" | "desc" | undefined;
	page?: number;
	limit?: number;
};

type ListarFatoresConversaoResposta = {
	data: FatorConversao[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarFatoresConversaoService({
	idusuario,
	idempresa,
	q,
	nome,
	fator,
	ordenarPor,
	ordem,
	page = 1,
	limit = 10,
}: ListarFatoresConversaoParametros): Promise<
	HttpResponse<ListarFatoresConversaoResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const resultado = await listarFatoresConversao({
		idempresa,
		q,
		nome,
		fator,
		ordenarPor,
		ordem,
		page,
		limit,
	});

	const total = resultado.total ?? 0;
	const totalPages = Math.ceil(total / limit);

	return httpOk<ListarFatoresConversaoResposta>({
		data: resultado.fatores,
		paginacao: {
			page,
			limit,
			total,
			totalPages,
		},
	});
}

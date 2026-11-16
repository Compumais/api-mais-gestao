import type { GrupoContrato } from "@/model/grupo-contrato-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	listarGruposContrato,
	type OrdenarGruposContratoCampo,
} from "@/repositories/grupo-contrato-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

type ListarGruposContratoParametros = {
	idusuario: string;
	idempresa: string;
	codigo?: string | undefined;
	descricao?: string | undefined;
	ordenarPor?: OrdenarGruposContratoCampo | undefined;
	ordem?: "asc" | "desc" | undefined;
	page?: number;
	limit?: number;
};

export async function listarGruposContratoService({
	idusuario,
	idempresa,
	codigo,
	descricao,
	ordenarPor,
	ordem,
	page = 1,
	limit = 10,
}: ListarGruposContratoParametros): Promise<
	HttpResponse<{
		data: GrupoContrato[];
		paginacao: {
			page: number;
			limit: number;
			total: number;
			totalPages: number;
		};
	}>
> {
	const pertence = await verificarUsuarioPertenceEmpresa(idusuario, idempresa);
	if (!pertence) return httpProibido();

	const resultado = await listarGruposContrato({
		idempresa,
		codigo,
		descricao,
		ordenarPor,
		ordem,
		page,
		limit,
	});

	return httpOk({
		data: resultado.grupos,
		paginacao: {
			page,
			limit,
			total: resultado.total,
			totalPages: Math.ceil(resultado.total / limit) || 0,
		},
	});
}

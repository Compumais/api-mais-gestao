import type { GrupoGourmet } from "@/model/grupo-gourmet-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { listarGruposGourmet } from "@/repositories/grupo-gourmet-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

type ListarGruposGourmetParametros = {
	idusuario: string;
	idempresa: string;
	nome?: string | undefined;
	q?: string | undefined;
	page?: number;
	limit?: number;
};

type ListarGruposGourmetResposta = {
	data: GrupoGourmet[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export async function listarGruposGourmetService({
	idusuario,
	idempresa,
	nome,
	q,
	page = 1,
	limit = 10,
}: ListarGruposGourmetParametros): Promise<
	HttpResponse<ListarGruposGourmetResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const resultado = await listarGruposGourmet({
		idempresa,
		nome,
		q,
		page,
		limit,
	});

	const total = resultado.total ?? 0;
	const totalPages = Math.ceil(total / limit) || 0;

	return httpOk<ListarGruposGourmetResposta>({
		data: resultado.grupos,
		paginacao: {
			page,
			limit,
			total,
			totalPages,
		},
	});
}

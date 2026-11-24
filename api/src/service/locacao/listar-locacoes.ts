import type { HttpResponse } from "@/model/http-model.js";
import type { Locacao } from "@/model/locacao-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	type ListarLocacoesParametros,
	listarLocacoes,
} from "@/repositories/locacao-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

export type LocacaoListagem = Locacao & { nomecliente: string };

export async function listarLocacoesService(
	parametros: ListarLocacoesParametros & { idusuario: string },
): Promise<
	HttpResponse<{
		data: LocacaoListagem[];
		paginacao: {
			page: number;
			limit: number;
			total: number;
			totalPages: number;
		};
	}>
> {
	const pertence = await verificarUsuarioPertenceEmpresa(
		parametros.idusuario,
		parametros.idempresa,
	);
	if (!pertence) return httpProibido();

	const page = parametros.page ?? 1;
	const limit = parametros.limit ?? 20;
	const resultado = await listarLocacoes({ ...parametros, page, limit });
	return httpOk({
		data: resultado.locacoes.map((registro) => ({
			...registro.locacao,
			nomecliente: registro.razaosocial?.trim() || registro.nomecliente,
		})),
		paginacao: {
			page,
			limit,
			total: resultado.total,
			totalPages: Math.max(1, Math.ceil(resultado.total / limit)),
		},
	});
}

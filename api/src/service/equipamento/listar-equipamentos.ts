import type { Equipamento } from "@/model/equipamento-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	type ListarEquipamentosParametros,
	listarEquipamentos,
} from "@/repositories/equipamento-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";

export async function listarEquipamentosService(
	parametros: ListarEquipamentosParametros & { idusuario: string },
): Promise<
	HttpResponse<{
		data: Equipamento[];
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
	const resultado = await listarEquipamentos({ ...parametros, page, limit });
	return httpOk({
		data: resultado.equipamentos,
		paginacao: {
			page,
			limit,
			total: resultado.total,
			totalPages: Math.max(1, Math.ceil(resultado.total / limit)),
		},
	});
}

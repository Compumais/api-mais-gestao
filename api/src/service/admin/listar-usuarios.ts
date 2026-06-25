import type { HttpResponse } from "@/model/http-model.js";
import { listarUsuariosGlobal } from "@/repositories/usuarios-repositories.js";
import { httpOk } from "@/util/http-util.js";

type ListarUsuariosAdminParams = {
	nome?: string;
	email?: string;
	ativo?: boolean;
	page?: number;
	limit?: number;
};

export async function listarUsuariosAdminService(
	params: ListarUsuariosAdminParams,
): Promise<HttpResponse<unknown>> {
	const resultado = await listarUsuariosGlobal(params);
	return httpOk(resultado);
}

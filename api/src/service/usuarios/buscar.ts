import type { HttpResponse } from "../../model/http-model.js";
import type { Usuario } from "../../model/usuario-model.js";
import {
	buscarEmpresasDoUsuario,
	buscarUsuarioPorId,
} from "../../repositories/usuarios-repositories.js";
import { httpCriacao, httpNaoEncontrado } from "../../util/http-util.js";

export type UsuarioComEmpresas = Usuario & {
	empresasIds: string[];
};

export async function buscarUsuarioPorIdService(
	id: string,
): Promise<HttpResponse<UsuarioComEmpresas | null>> {
	const usuario = await buscarUsuarioPorId(id);

	if (!usuario) {
		return httpNaoEncontrado();
	}

	const empresasIds = await buscarEmpresasDoUsuario(id);

	return httpCriacao<UsuarioComEmpresas>({
		...usuario,
		empresasIds,
	});
}

import type { HttpResponse } from "../../model/http-model";
import type { Usuario } from "../../model/usuario-model";
import {
	buscarUsuarioPorId,
	buscarEmpresasDoUsuario,
} from "../../repositories/usuarios-repositories";
import { httpCriacao, httpNaoEncontrado } from "../../util/http-util";

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

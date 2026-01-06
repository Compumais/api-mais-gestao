import type { HttpResponse } from "../../model/http-model";
import type { Usuario } from "../../model/usuario-model";
import { buscarUsuarioPorId } from "../../repositories/usuarios-model";
import { httpCriacao, httpNaoEncontrado } from "../../util/http-util";

export async function buscarUsuarioPorIdService(
	id: string,
): Promise<HttpResponse<Usuario | null>> {
	const usuario = await buscarUsuarioPorId(id);

	if (!usuario) {
		return httpNaoEncontrado();
	}

	return httpCriacao<Usuario>(usuario);
}

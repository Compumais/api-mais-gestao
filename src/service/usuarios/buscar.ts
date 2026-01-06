import { buscarUsuarioPorId } from "../../models/usuarios-model";

export async function buscarUsuarioPorIdService(id: string) {
	const usuario = await buscarUsuarioPorId(id);

	if (!usuario) {
		throw new Error("Usuario não encontrado");
	}

	return usuario;
}

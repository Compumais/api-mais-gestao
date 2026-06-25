import { normalizarPerfilArray } from "./usuario-perfil.js";
import { verificarPermissao } from "./verificar-permissao.js";

export function verificarPodeGerenciarUsuarios(
	roles: string | string[] | unknown,
): boolean {
	return verificarPermissao(normalizarPerfilArray(roles), [
		"admin",
		"proprietario",
	]);
}

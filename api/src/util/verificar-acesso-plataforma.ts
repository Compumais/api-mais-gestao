import { buscarEmpresaPorId } from "@/repositories/empresa-repositories.js";
import {
	buscarEmpresasDoUsuario,
	buscarUsuarioPorId,
} from "@/repositories/usuarios-repositories.js";
import { isSuper } from "@/util/verificar-super.js";

export type ResultadoAcessoPlataforma = {
	permitido: boolean;
	motivo?: string;
	code?: string;
};

export async function verificarUsuarioPodeAcessarPlataforma(
	idusuario: string,
	roles: string[],
): Promise<ResultadoAcessoPlataforma> {
	if (isSuper(roles)) {
		return { permitido: true };
	}

	const usuario = await buscarUsuarioPorId(idusuario);
	if (!usuario) {
		return {
			permitido: false,
			motivo: "Usuário não encontrado",
			code: "USER_NOT_FOUND",
		};
	}

	if (usuario.ativo === false) {
		return {
			permitido: false,
			motivo: "Usuário inativo",
			code: "USER_INACTIVE",
		};
	}

	const empresasIds = await buscarEmpresasDoUsuario(idusuario);

	for (const idempresa of empresasIds) {
		const empresa = await buscarEmpresaPorId(idempresa);
		if (!empresa?.idproprietario) continue;

		const proprietario = await buscarUsuarioPorId(empresa.idproprietario);
		if (proprietario && proprietario.ativo === false) {
			return {
				permitido: false,
				motivo:
					"Acesso bloqueado: o proprietário da empresa está inativo",
				code: "OWNER_INACTIVE",
			};
		}
	}

	return { permitido: true };
}

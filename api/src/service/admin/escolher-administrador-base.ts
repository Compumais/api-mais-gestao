import { normalizarPerfilArray } from "@/util/usuario-perfil.js";

export type CandidatoAdministradorBase = {
	id: string;
	perfil: unknown;
	ativo?: boolean | null;
};

function perfilTem(perfil: unknown, alvo: string): boolean {
	return normalizarPerfilArray(perfil).includes(alvo);
}

function podeAssumirBase(candidato: CandidatoAdministradorBase): boolean {
	if (candidato.ativo === false) return false;
	return !perfilTem(candidato.perfil, "super");
}

/**
 * Prefere um usuário com perfil admin da empresa.
 * Se não houver, usa o proprietário que não é super.
 */
export function escolherAdministradorBase(
	candidatos: CandidatoAdministradorBase[],
	idproprietario: string,
): CandidatoAdministradorBase | null {
	const elegiveis = candidatos.filter(podeAssumirBase);
	const admin = elegiveis.find((candidato) =>
		perfilTem(candidato.perfil, "admin"),
	);
	if (admin) return admin;

	return (
		elegiveis.find(
			(candidato) =>
				candidato.id === idproprietario &&
				perfilTem(candidato.perfil, "proprietario"),
		) ?? null
	);
}

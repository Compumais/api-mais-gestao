import z from "zod/v4";

export const PERFIS_USUARIO = [
	"usuario",
	"admin",
	"proprietario",
	"garcom",
] as const;

export type PerfilUsuario = (typeof PERFIS_USUARIO)[number];

export const perfilUsuarioSchema = z.union([
	z.enum(PERFIS_USUARIO),
	z.array(z.enum(PERFIS_USUARIO)).min(1),
]);

export function normalizarPerfilArray(
	perfil: string | string[] | unknown,
): string[] {
	if (Array.isArray(perfil)) {
		return perfil.filter((item): item is string => typeof item === "string");
	}
	if (typeof perfil === "string" && perfil.length > 0) {
		return [perfil];
	}
	return [];
}

export function perfisPersistidosIguais(
	salvo: unknown,
	esperado: string[],
): boolean {
	const normalizado = normalizarPerfilArray(salvo);
	if (normalizado.length !== esperado.length) return false;
	return normalizado.every((valor, indice) => valor === esperado[indice]);
}

export function extrairPerfilInformadoNaCriacao(
	user: Record<string, unknown>,
): string[] | null {
	const perfil = normalizarPerfilArray(user.perfil);
	return perfil.length > 0 ? perfil : null;
}

export function resolverPerfilNaCriacao(
	user: Record<string, unknown>,
): string[] {
	const informado = extrairPerfilInformadoNaCriacao(user);
	if (
		informado &&
		informado.every((p) =>
			PERFIS_USUARIO.includes(p as PerfilUsuario),
		)
	) {
		return informado;
	}
	return ["proprietario"];
}

export function toPerfilArray(perfil: string | string[]): string[] {
	return normalizarPerfilArray(perfil);
}

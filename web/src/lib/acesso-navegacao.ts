import { hasPerfil, normalizePerfis } from "./perfis";

export type AcessoNavegacao = {
	/** Perfis permitidos. Se omitido, qualquer perfil autenticado (exceto restrições especiais). */
	perfis?: string[];
	/** Feature SaaS exigida (herdada do plano do proprietário). */
	feature?: string;
	/** Módulo SaaS exigido. */
	modulo?: string;
};

export type ContextoAcesso = {
	perfil: string | string[] | null | undefined;
	hasFeature: (codigo: string) => boolean;
	hasModulo: (codigo: string) => boolean;
};

export function podeAcessarPorPolitica(
	acesso: AcessoNavegacao | undefined,
	ctx: ContextoAcesso,
): boolean {
	if (!acesso) return true;

	if (acesso.perfis && acesso.perfis.length > 0) {
		const perfisUsuario = normalizePerfis(ctx.perfil);
		const permitido = acesso.perfis.some((p) => perfisUsuario.includes(p));
		if (!permitido) return false;
	}

	if (acesso.feature && !ctx.hasFeature(acesso.feature)) {
		return false;
	}

	if (acesso.modulo && !ctx.hasModulo(acesso.modulo)) {
		return false;
	}

	return true;
}

/** Perfis que veem o menu completo do ERP (exceto itens com restrição própria). */
export const PERFIS_MENU_COMPLETO = [
	"proprietario",
	"admin",
	"financeiro",
] as const;

/** Perfis com menu reduzido (Dashboard + Clientes + subset). */
export function isPerfilMenuRestrito(
	perfil: string | string[] | null | undefined,
): boolean {
	const perfis = normalizePerfis(perfil);
	if (perfis.includes("garcom")) return false;
	if (
		perfis.some((p) => (PERFIS_MENU_COMPLETO as readonly string[]).includes(p))
	) {
		return false;
	}
	return hasPerfil(perfil, "usuario");
}

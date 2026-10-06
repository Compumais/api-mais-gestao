const ACESSO_BASE_ATIVO_KEY = "acesso-base:ativo";

export function marcarAcessoBaseAtivo() {
	if (typeof window === "undefined") return;
	sessionStorage.setItem(ACESSO_BASE_ATIVO_KEY, "1");
}

export function limparAcessoBaseAtivo() {
	if (typeof window === "undefined") return;
	sessionStorage.removeItem(ACESSO_BASE_ATIVO_KEY);
}

export function acessoBaseEstaAtivo(): boolean {
	if (typeof window === "undefined") return false;
	return sessionStorage.getItem(ACESSO_BASE_ATIVO_KEY) === "1";
}

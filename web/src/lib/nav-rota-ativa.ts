/**
 * Verifica se a rota atual corresponde a um link de navegação.
 * Links com query (ex.: /configuracoes?tab=integracoes-contabeis) exigem match exato dos params.
 * Links sem query não ficam ativos quando a aba atual pertence a outro item do mesmo path.
 */
const TAB_EXCLUSIVO_POR_PATH: Record<string, string[]> = {
	"/configuracoes": ["integracoes-contabeis"],
};

export function rotaNavEstaAtiva(
	pathname: string,
	search: string,
	url: string,
): boolean {
	const [path, navQuery] = url.split("?");
	if (!path || path === "#") return false;

	const pathCorresponde =
		pathname === path || pathname.startsWith(`${path}/`);
	if (!pathCorresponde) return false;

	const searchNorm = search.startsWith("?") ? search.slice(1) : search;
	const paramsAtuais = new URLSearchParams(searchNorm);

	if (navQuery) {
		const paramsNav = new URLSearchParams(navQuery);
		for (const [chave, valor] of paramsNav) {
			if (paramsAtuais.get(chave) !== valor) return false;
		}
		return true;
	}

	const tabsExclusivos = TAB_EXCLUSIVO_POR_PATH[path];
	if (tabsExclusivos?.length) {
		const tabAtual = paramsAtuais.get("tab");
		if (tabAtual && tabsExclusivos.includes(tabAtual)) return false;
	}

	return true;
}

export function itemNavTemRotaAtiva(
	pathname: string,
	search: string,
	item: {
		url?: string;
		items?: { url: string }[];
	},
): boolean {
	if (item.url && rotaNavEstaAtiva(pathname, search, item.url)) return true;
	return Boolean(
		item.items?.some((sub) => rotaNavEstaAtiva(pathname, search, sub.url)),
	);
}

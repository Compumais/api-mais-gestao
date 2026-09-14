import { rotaNavEstaAtiva } from "@/lib/nav-rota-ativa";

export const NAV_ABAS_STORAGE_PREFIX = "mais-gestao:nav-abas-abertas";
export const NAV_ABAS_MAX = 15;

export type AbaAberta = {
	/** Identificador estável da aba (pathname). */
	id: string;
	/** Href completo para restaurar a navegação. */
	href: string;
	title: string;
};

export function chaveNavAbasAbertas(userId: string) {
	return `${NAV_ABAS_STORAGE_PREFIX}:${userId}`;
}

export function montarHrefAba(pathname: string, search: string): string {
	const searchNorm = search.startsWith("?") ? search.slice(1) : search;
	return searchNorm ? `${pathname}?${searchNorm}` : pathname;
}

export function lerAbasAbertas(raw: string | null): AbaAberta[] {
	if (!raw) return [];
	try {
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed.flatMap((item) => {
			if (!item || typeof item !== "object") return [];
			const rec = item as Record<string, unknown>;
			const id = typeof rec.id === "string" ? rec.id : "";
			const href = typeof rec.href === "string" ? rec.href : "";
			const title = typeof rec.title === "string" ? rec.title : "";
			if (!id || !href || !title) return [];
			return [{ id, href, title }];
		});
	} catch {
		return [];
	}
}

export function resolverTituloAba(
	pathname: string,
	search: string,
	itens: { url: string; title: string }[],
): string {
	let melhor: { url: string; title: string } | null = null;
	let melhorScore = -1;

	for (const item of itens) {
		if (!rotaNavEstaAtiva(pathname, search, item.url)) continue;
		const path = item.url.split("?")[0] ?? item.url;
		const score = path.length + (item.url.includes("?") ? 1_000 : 0);
		if (score > melhorScore) {
			melhor = item;
			melhorScore = score;
		}
	}

	if (melhor) return melhor.title;

	const segmento = pathname.split("/").filter(Boolean).pop() ?? "Página";
	try {
		return decodeURIComponent(segmento).replace(/-/g, " ");
	} catch {
		return segmento.replace(/-/g, " ");
	}
}

/**
 * Abre ou atualiza a aba da rota atual.
 * Mesmo pathname atualiza href/título; rotas novas entram no fim.
 * Se passar do limite, remove a aba mais antiga que não seja a ativa.
 */
export function registrarAbaAberta(
	abas: AbaAberta[],
	pathname: string,
	search: string,
	title: string,
	max = NAV_ABAS_MAX,
): AbaAberta[] {
	if (!pathname || pathname === "/") return abas;

	const href = montarHrefAba(pathname, search);
	const existente = abas.find((aba) => aba.id === pathname);

	if (existente) {
		return abas.map((aba) =>
			aba.id === pathname ? { ...aba, href, title } : aba,
		);
	}

	const nova: AbaAberta = { id: pathname, href, title };
	let proximas = [...abas, nova];

	while (proximas.length > max) {
		const indiceRemover = proximas.findIndex((aba) => aba.id !== pathname);
		if (indiceRemover < 0) break;
		proximas = proximas.filter((_, i) => i !== indiceRemover);
	}

	return proximas;
}

export function fecharAbaAberta(
	abas: AbaAberta[],
	id: string,
	ativaId: string | null,
): { abas: AbaAberta[]; navegarPara: string | null } {
	const indice = abas.findIndex((aba) => aba.id === id);
	if (indice < 0) return { abas, navegarPara: null };

	const proximas = abas.filter((aba) => aba.id !== id);
	if (id !== ativaId) {
		return { abas: proximas, navegarPara: null };
	}

	const vizinha = proximas[indice] ?? proximas[indice - 1] ?? null;
	return { abas: proximas, navegarPara: vizinha?.href ?? "/dashboard" };
}

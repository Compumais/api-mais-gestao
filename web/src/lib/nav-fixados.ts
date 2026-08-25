import type { Icon } from "@tabler/icons-react";
import type { NavItem } from "@/constants/nav-constants";

export const NAV_FIXADOS_STORAGE_PREFIX = "mais-gestao:nav-fixados";
export const NAV_FIXADOS_MAX = 10;

export type ItemNavFixavel = {
	url: string;
	title: string;
	icon?: Icon;
};

export function chaveNavFixados(userId: string) {
	return `${NAV_FIXADOS_STORAGE_PREFIX}:${userId}`;
}

export function ehUrlNavFixavel(url: string | undefined): url is string {
	return Boolean(url && url !== "#");
}

export function lerUrlsNavFixados(raw: string | null): string[] {
	if (!raw) return [];
	try {
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed.filter(
			(item): item is string => typeof item === "string" && item.length > 0,
		);
	} catch {
		return [];
	}
}

export function coletarItensNavFixaveis(grupos: NavItem[][]): ItemNavFixavel[] {
	const vistos = new Set<string>();
	const itens: ItemNavFixavel[] = [];

	for (const grupo of grupos) {
		for (const item of grupo) {
			if (ehUrlNavFixavel(item.url) && !vistos.has(item.url)) {
				vistos.add(item.url);
				itens.push({
					url: item.url,
					title: item.title,
					...(item.icon ? { icon: item.icon } : {}),
				});
			}

			for (const sub of item.items ?? []) {
				if (!ehUrlNavFixavel(sub.url) || vistos.has(sub.url)) continue;
				vistos.add(sub.url);
				itens.push({
					url: sub.url,
					title: sub.title,
					...(item.icon ? { icon: item.icon } : {}),
				});
			}
		}
	}

	return itens;
}

export function resolverNavFixados(
	urls: string[],
	disponiveis: ItemNavFixavel[],
): ItemNavFixavel[] {
	const mapa = new Map(disponiveis.map((item) => [item.url, item]));
	return urls.flatMap((url) => {
		const item = mapa.get(url);
		return item ? [item] : [];
	});
}

export function alternarUrlNavFixado(
	urls: string[],
	url: string,
	max = NAV_FIXADOS_MAX,
): { urls: string[]; limiteAtingido: boolean } {
	if (urls.includes(url)) {
		return {
			urls: urls.filter((item) => item !== url),
			limiteAtingido: false,
		};
	}

	if (urls.length >= max) {
		return { urls, limiteAtingido: true };
	}

	return { urls: [url, ...urls], limiteAtingido: false };
}
